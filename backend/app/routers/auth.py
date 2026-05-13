from datetime import datetime, timedelta, timezone
from secrets import compare_digest
from threading import Lock
from fastapi import APIRouter, HTTPException, Request
from jose import jwt
from app.config import settings
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Autenticación"])

MAX_FAILED_ATTEMPTS = 5
FAILED_ATTEMPT_WINDOW = timedelta(minutes=15)
_failed_attempts: dict[str, list[datetime]] = {}
_failed_attempts_lock = Lock()


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


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request):
    """
    Valida la contraseña compartida y devuelve un JWT con 30 días de vida.
    El frontend guarda ese token en localStorage y lo envía en cada request.
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
    return TokenResponse(token=token)
