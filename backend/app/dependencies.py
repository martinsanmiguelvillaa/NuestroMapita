from typing import Optional
from fastapi import Cookie, HTTPException
from jose import jwt, JWTError, ExpiredSignatureError
from app.config import settings


def get_current_user(mapita_token: Optional[str] = Cookie(default=None)) -> bool:
    """
    Dependency que valida el JWT en la HttpOnly cookie.
    Si la cookie no existe o el token es inválido, devuelve 401.
    """
    if not mapita_token:
        raise HTTPException(
            status_code=401,
            detail="No autorizado. Iniciá sesión primero.",
        )

    try:
        jwt.decode(mapita_token, settings.SECRET_KEY, algorithms=["HS256"])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="La sesión expiró. Iniciá sesión de nuevo.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido.")

    return True
