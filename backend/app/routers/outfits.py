import json
import time
from datetime import datetime, timedelta, timezone

import requests as http
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.outfit_cache import OutfitCache

router = APIRouter(prefix="/outfits", tags=["Outfits"])

_SIX_DAYS = 6 * 24 * 3600

# Caché en memoria: user_key → {token, user_id, created_at}
_sessions: dict[str, dict] = {}

# Datos no sensibles para el registro en la API externa
_USER_META = {
    "van": {
        "name": "Van",
        "last_name": "Mapita",
        "gender": "femenino",
        "phone_number": "1100000001",
        "city": "Buenos Aires",
    },
    "martin": {
        "name": "Martín",
        "last_name": "Mapita",
        "gender": "masculino",
        "phone_number": "1100000002",
        "city": "Buenos Aires",
    },
}


def _get_credentials(user_key: str) -> tuple[str, str]:
    if user_key == "van":
        return settings.OUTFITS_VAN_MAIL, settings.OUTFITS_VAN_PASSWORD
    if user_key == "martin":
        return settings.OUTFITS_MARTIN_MAIL, settings.OUTFITS_MARTIN_PASSWORD
    raise HTTPException(status_code=400, detail="Usuario inválido. Valores posibles: van, martin")


def _register(mail: str, password: str, meta: dict) -> None:
    """Intenta registrar el usuario; si ya existe, lo ignora."""
    try:
        http.post(
            f"{settings.OUTFITS_API_URL}/users",
            json={
                "name": meta["name"],
                "last_name": meta["last_name"],
                "gender": meta["gender"],
                "mail": mail,
                "phone_number": meta["phone_number"],
                "password": password,
                "preferred_channel": "mail",
                "city": meta["city"],
            },
            timeout=10,
        )
    except Exception:
        pass  # Si ya existe o hay error de red, continuamos con el login


def _login(mail: str, password: str) -> tuple[str, int]:
    try:
        resp = http.post(
            f"{settings.OUTFITS_API_URL}/auth/login",
            json={"mail": mail, "password": password},
            timeout=10,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="No se pudo conectar con la API de outfits") from exc
    if not resp.ok:
        raise HTTPException(status_code=502, detail="Error al autenticar con la API de outfits")
    data = resp.json()
    return data["access_token"], data["user"]["id"]


def _ensure_session(user_key: str, *, force: bool = False) -> dict:
    """Devuelve la sesión cacheada o crea una nueva si expiró o si force=True."""
    if not settings.OUTFITS_API_URL:
        raise HTTPException(status_code=503, detail="OUTFITS_API_URL no configurada")

    cached = _sessions.get(user_key)
    if not force and cached and (time.time() - cached["created_at"]) < _SIX_DAYS:
        return cached

    mail, password = _get_credentials(user_key)
    if not mail or not password:
        raise HTTPException(status_code=503, detail=f"Credenciales de '{user_key}' no configuradas")

    _register(mail, password, _USER_META[user_key])
    token, user_id = _login(mail, password)

    session = {"token": token, "user_id": user_id, "created_at": time.time()}
    _sessions[user_key] = session
    return session


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _proxy(user_key: str, fn):
    """Llama fn(session) y reintenta una vez si la API externa devuelve 401."""
    session = _ensure_session(user_key)
    resp = fn(session)
    if resp.status_code == 401:
        session = _ensure_session(user_key, force=True)
        resp = fn(session)
    return resp


# ── Endpoints ──────────────────────────────────────────────────────────────


@router.get("/{user_key}/outfit")
def get_outfit(user_key: str, _: bool = Depends(get_current_user)):
    resp = _proxy(
        user_key,
        lambda s: http.get(
            f"{settings.OUTFITS_API_URL}/users/{s['user_id']}/outfit",
            headers=_auth_header(s["token"]),
            timeout=15,
        ),
    )
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail="Error al obtener el outfit")
    return resp.json()


@router.get("/{user_key}/preferences")
def get_preferences(user_key: str, _: bool = Depends(get_current_user)):
    resp = _proxy(
        user_key,
        lambda s: http.get(
            f"{settings.OUTFITS_API_URL}/preferences/{s['user_id']}/preferences",
            headers=_auth_header(s["token"]),
            timeout=10,
        ),
    )
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail="Error al obtener preferencias")
    return resp.json()


class PreferenceBody(BaseModel):
    preferences: str


@router.post("/{user_key}/preferences", status_code=201)
def add_preference(user_key: str, body: PreferenceBody, _: bool = Depends(get_current_user)):
    resp = _proxy(
        user_key,
        lambda s: http.post(
            f"{settings.OUTFITS_API_URL}/preferences/{s['user_id']}/outfit_preferences",
            json={"preferences": body.preferences},
            headers=_auth_header(s["token"]),
            timeout=10,
        ),
    )
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail="Error al agregar preferencia")
    return resp.json()


@router.get("/{user_key}/cached-outfit")
def get_cached_outfit(
    user_key: str,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """
    Devuelve el outfit pre-generado si existe y fue generado en las últimas 12 horas.
    Si no hay caché válido, devuelve 404 para que el frontend llame al endpoint normal.
    """
    cache = db.query(OutfitCache).filter_by(user_key=user_key).first()
    if not cache:
        raise HTTPException(status_code=404, detail="Sin caché")
    if datetime.now(timezone.utc).replace(tzinfo=None) - cache.generated_at > timedelta(hours=12):
        raise HTTPException(status_code=404, detail="Caché expirado")
    return {
        "outfit": json.loads(cache.outfit_data),
        "weather": json.loads(cache.weather_data),
        "from_cache": True,
    }


@router.delete("/{user_key}/preferences/{pref_id}", status_code=204)
def delete_preference(user_key: str, pref_id: int, _: bool = Depends(get_current_user)):
    resp = _proxy(
        user_key,
        lambda s: http.delete(
            f"{settings.OUTFITS_API_URL}/preferences/{s['user_id']}/preference/{pref_id}",
            headers=_auth_header(s["token"]),
            timeout=10,
        ),
    )
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail="Error al eliminar preferencia")
    return None
