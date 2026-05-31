"""
Router unificado de push notifications.

Endpoints nuevos (usan device_subscriptions):
  POST   /push/register   — registrar dispositivo
  DELETE /push/unregister — desregistrar dispositivo
  GET    /push/status     — estado del dispositivo
  PATCH  /push/settings   — actualizar configuración
  POST   /push/test       — enviar notificación de prueba

Endpoints legacy (proxies para compatibilidad):
  GET    /push/vapid-public-key
  POST   /push/subscribe     → equivalente a /push/register con user_key="ambos"
  POST   /push/unsubscribe   → equivalente a /push/unregister
"""
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.device_subscription import DeviceSubscription
from app.config import settings
from app.services.push_service import send_push_to_endpoint

router = APIRouter(prefix="/push", tags=["Push"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionInfo(BaseModel):
    endpoint: str
    keys: PushKeys


class RegisterRequest(BaseModel):
    device_id: str
    user_key: str = "ambos"            # "van" | "martin" | "ambos"
    subscription: PushSubscriptionInfo
    device_label: Optional[str] = None
    timezone: str = "America/Argentina/Buenos_Aires"


class UnregisterRequest(BaseModel):
    device_id: str
    user_key: str = "ambos"


class SettingsRequest(BaseModel):
    device_id: str
    user_key: str = "ambos"
    enabled: Optional[bool] = None
    outfit_notif_enabled: Optional[bool] = None
    outfit_notif_time: Optional[str] = None

    @field_validator("outfit_notif_time")
    @classmethod
    def validate_time(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^\d{2}:\d{2}$", v):
            raise ValueError("outfit_notif_time debe tener formato HH:MM")
        hh, mm = int(v[:2]), int(v[3:])
        if not (0 <= hh <= 23 and 0 <= mm <= 59):
            raise ValueError("Hora inválida")
        return v


# Legacy schema (backward compat)
class LegacySubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_sub(db: Session, device_id: str, user_key: str) -> DeviceSubscription | None:
    return db.query(DeviceSubscription).filter_by(device_id=device_id, user_key=user_key).first()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/vapid-public-key")
def get_vapid_public_key():
    return {"publicKey": settings.VAPID_PUBLIC_KEY}


@router.post("/register", status_code=200)
def register_device(
    body: RegisterRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Crea o actualiza la suscripción push de un dispositivo."""
    sub = _get_sub(db, body.device_id, body.user_key)
    if sub:
        sub.endpoint = body.subscription.endpoint
        sub.p256dh = body.subscription.keys.p256dh
        sub.auth = body.subscription.keys.auth
        sub.enabled = True
        if body.device_label:
            sub.device_label = body.device_label
        if body.timezone:
            sub.timezone = body.timezone
    else:
        sub = DeviceSubscription(
            device_id=body.device_id,
            user_key=body.user_key,
            endpoint=body.subscription.endpoint,
            p256dh=body.subscription.keys.p256dh,
            auth=body.subscription.keys.auth,
            device_label=body.device_label,
            timezone=body.timezone,
            enabled=True,
        )
        db.add(sub)
    db.commit()
    return {"ok": True}


@router.delete("/unregister", status_code=200)
def unregister_device(
    body: UnregisterRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Elimina la suscripción push de un dispositivo."""
    db.query(DeviceSubscription).filter_by(device_id=body.device_id, user_key=body.user_key).delete()
    db.commit()
    return {"ok": True}


@router.get("/status")
def get_device_status(
    device_id: str = Query(...),
    user_key: str = Query("ambos"),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Devuelve el estado de la suscripción push de un dispositivo."""
    sub = _get_sub(db, device_id, user_key)
    if not sub:
        return {
            "exists": False,
            "enabled": False,
            "outfit_notif_enabled": None,
            "outfit_notif_time": None,
            "device_label": None,
        }
    return {
        "exists": True,
        "enabled": sub.enabled,
        "outfit_notif_enabled": sub.outfit_notif_enabled,
        "outfit_notif_time": sub.outfit_notif_time,
        "device_label": sub.device_label,
    }


@router.patch("/settings", status_code=200)
def update_settings(
    body: SettingsRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Actualiza configuración de un dispositivo (enabled, outfit_notif_enabled, outfit_notif_time)."""
    sub = _get_sub(db, body.device_id, body.user_key)
    if not sub:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada")
    if body.enabled is not None:
        sub.enabled = body.enabled
    if body.outfit_notif_enabled is not None:
        sub.outfit_notif_enabled = body.outfit_notif_enabled
    if body.outfit_notif_time is not None:
        sub.outfit_notif_time = body.outfit_notif_time
    db.commit()
    return {"ok": True}


@router.post("/test", status_code=200)
def test_push(
    device_id: str = Query(...),
    user_key: str = Query("ambos"),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Envía una notificación de prueba a un dispositivo específico."""
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIMS_EMAIL:
        raise HTTPException(
            status_code=503,
            detail="VAPID no configurado. Agregá VAPID_PRIVATE_KEY y VAPID_CLAIMS_EMAIL.",
        )
    sub = _get_sub(db, device_id, user_key)
    if not sub:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada")

    success = send_push_to_endpoint(
        endpoint=sub.endpoint,
        p256dh=sub.p256dh,
        auth=sub.auth,
        title="🔔 Notificación de prueba",
        body="Las notificaciones están funcionando.",
        url="/",
    )
    if not success:
        sub.enabled = False
        db.commit()
        raise HTTPException(status_code=400, detail="Suscripción expirada o inválida — fue deshabilitada")
    return {"ok": True}


# ── Endpoints legacy (backward compat) ────────────────────────────────────────

@router.post("/subscribe", status_code=201)
def subscribe_legacy(
    req: LegacySubscribeRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Legacy: crea suscripción genérica. Usa user_key='ambos' y genera device_id del endpoint."""
    import hashlib
    device_id = "legacy-" + hashlib.md5(req.endpoint.encode()).hexdigest()[:20]
    sub = _get_sub(db, device_id, "ambos")
    if sub:
        sub.endpoint = req.endpoint
        sub.p256dh = req.p256dh
        sub.auth = req.auth
        sub.enabled = True
    else:
        existing_endpoint = db.query(DeviceSubscription).filter_by(endpoint=req.endpoint).first()
        if existing_endpoint:
            return {"status": "already_subscribed"}
        sub = DeviceSubscription(
            device_id=device_id,
            user_key="ambos",
            endpoint=req.endpoint,
            p256dh=req.p256dh,
            auth=req.auth,
            enabled=True,
        )
        db.add(sub)
    db.commit()
    return {"status": "subscribed"}


@router.post("/unsubscribe")
def unsubscribe_legacy(
    req: LegacySubscribeRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Legacy: elimina suscripción por endpoint."""
    db.query(DeviceSubscription).filter_by(endpoint=req.endpoint).delete()
    db.commit()
    return {"status": "unsubscribed"}
