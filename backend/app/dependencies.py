from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError, ExpiredSignatureError
from app.config import settings


def get_current_user(authorization: str = Header(default=None)) -> bool:
    """
    Dependency que valida el JWT en el header Authorization.
    Si el token es inválido o expiró, devuelve 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="No autorizado. Iniciá sesión primero.",
        )

    token = authorization.split(" ", 1)[1]

    try:
        jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="La sesión expiró. Iniciá sesión de nuevo.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido.")

    return True
