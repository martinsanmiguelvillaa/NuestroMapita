from datetime import datetime, timedelta, timezone
from secrets import compare_digest
from threading import Lock
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from jose import jwt
from app.config import settings
from app.dependencies import get_current_user
from app.schemas.auth import LoginRequest

router = APIRouter(prefix="/auth", tags=["Autenticación"])

MAX_FAILED_ATTEMPTS = 5
FAILED_ATTEMPT_WINDOW = timedelta(minutes=15)
_failed_attempts: dict[str, list[datetime]] = {}
_failed_attempts_lock = Lock()

COOKIE_NAME = "mapita_token"
COOKIE_KWARGS = dict(
    httponly=True,
    samesite="none",
    secure=settings.COOKIE_SECURE,
    max_age=30 * 24 * 3600,
)


def _client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


def _prune_attempts(now: datetime) -> None:
    for key, attempts in list(_failed_attempts.items()):
        active = [attempt for attempt in attempts if now - attempt < FAILED_ATTEMPT_WINDOW]
        if active:
            _failed_attempts[key] = active
        else:
            _failed_attempts.pop(key, None)


def _register_failed_login(key: str, now: datetime) -> None:
    _failed_attempts.setdefault(key, []).append(now)


def _is_blocked(key: str, now: datetime) -> bool:
    attempts = _failed_attempts.get(key, [])
    active_attempts = [attempt for attempt in attempts if now - attempt < FAILED_ATTEMPT_WINDOW]
    _failed_attempts[key] = active_attempts
    return len(active_attempts) >= MAX_FAILED_ATTEMPTS


@router.post("/login")
def login(data: LoginRequest, request: Request, response: Response):
    """
    Valida la contraseña compartida y setea un JWT como HttpOnly cookie.
    """
    now = datetime.now(timezone.utc)
    client_key = _client_key(request)

    with _failed_attempts_lock:
        _prune_attempts(now)

        if _is_blocked(client_key, now):
            raise HTTPException(status_code=429, detail="Demasiados intentos. Probá de nuevo más tarde.")

        if not compare_digest(data.password, settings.APP_PASSWORD):
            _register_failed_login(client_key, now)
            raise HTTPException(status_code=401, detail="Contraseña incorrecta")

        _failed_attempts.pop(client_key, None)

    payload = {
        "sub": "pareja",
        "exp": now + timedelta(days=30),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    response.set_cookie(key=COOKIE_NAME, value=token, **COOKIE_KWARGS)
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    """Elimina la cookie de sesión."""
    response.delete_cookie(
        key=COOKIE_NAME,
        samesite="none",
        secure=settings.COOKIE_SECURE,
    )
    return {"ok": True}


@router.get("/me")
def me(_: bool = Depends(get_current_user)):
    """Verifica que la sesión actual sea válida."""
    return {"ok": True}
