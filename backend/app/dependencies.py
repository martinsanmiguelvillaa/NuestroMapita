from typing import Optional
from fastapi import Cookie, Header, HTTPException
from jose import jwt, JWTError, ExpiredSignatureError
from app.config import settings


def get_current_user(
    mapita_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> bool:
    """
    Valida el JWT en la HttpOnly cookie o en el header Authorization: Bearer <token>.
    El header es un fallback para entornos donde el proxy no reenvía Set-Cookie (ej. iOS Safari + Vercel).
    """
    token = mapita_token

    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    if not token:
        raise HTTPException(
            status_code=401,
            detail="No autorizado. Iniciá sesión primero.",
        )

    try:
        jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="La sesión expiró. Iniciá sesión de nuevo.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido.")

    return True
