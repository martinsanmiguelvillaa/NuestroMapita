from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from jose import jwt
from app.config import settings
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    """
    Valida la contraseña compartida y devuelve un JWT con 30 días de vida.
    El frontend guarda ese token en localStorage y lo envía en cada request.
    """
    if data.password != settings.APP_PASSWORD:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    payload = {
        "sub": "pareja",
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return TokenResponse(token=token)
