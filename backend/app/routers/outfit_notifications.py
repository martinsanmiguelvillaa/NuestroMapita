"""
Endpoints para gestionar notificaciones push de outfits por usuario y dispositivo.
Cada suscripción es única por (user_key, device_id).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.outfit_notification import OutfitNotificationSubscription
from app.services.outfit_notification_scheduler import send_now
from app.schemas.outfit_notification import (
    OutfitNotificationSubscribeRequest,
    OutfitNotificationSettingsRequest,
    OutfitNotificationUnsubscribeRequest,
    OutfitNotificationStatusResponse,
)

router = APIRouter(prefix="/outfits/notifications", tags=["Outfit Notifications"])


def _get_sub(db: Session, user_key: str, device_id: str) -> OutfitNotificationSubscription | None:
    return (
        db.query(OutfitNotificationSubscription)
        .filter_by(user_key=user_key, device_id=device_id)
        .first()
    )


@router.post("/subscribe", status_code=200)
def subscribe(
    body: OutfitNotificationSubscribeRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Crea o actualiza la suscripción para un usuario en un dispositivo específico."""
    sub = _get_sub(db, body.user_key, body.device_id)

    if sub:
        sub.endpoint = body.subscription.endpoint
        sub.p256dh = body.subscription.keys.p256dh
        sub.auth = body.subscription.keys.auth
        sub.notification_time = body.notification_time
        sub.timezone = body.timezone
        sub.enabled = True
        if body.device_label:
            sub.device_label = body.device_label
    else:
        sub = OutfitNotificationSubscription(
            user_key=body.user_key,
            device_id=body.device_id,
            endpoint=body.subscription.endpoint,
            p256dh=body.subscription.keys.p256dh,
            auth=body.subscription.keys.auth,
            notification_time=body.notification_time,
            timezone=body.timezone,
            enabled=True,
            device_label=body.device_label,
        )
        db.add(sub)

    db.commit()
    return {"ok": True}


@router.get("/status", response_model=OutfitNotificationStatusResponse)
def get_status(
    user_key: str,
    device_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Devuelve el estado de las notificaciones para este usuario y dispositivo."""
    sub = _get_sub(db, user_key, device_id)
    if not sub:
        return OutfitNotificationStatusResponse(
            exists=False,
            enabled=False,
            notification_time=None,
            timezone=None,
            device_label=None,
        )
    return OutfitNotificationStatusResponse(
        exists=True,
        enabled=sub.enabled,
        notification_time=sub.notification_time,
        timezone=sub.timezone,
        device_label=sub.device_label,
    )


@router.patch("/settings", status_code=200)
def update_settings(
    body: OutfitNotificationSettingsRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Actualiza horario o estado enabled de una suscripción existente."""
    sub = _get_sub(db, body.user_key, body.device_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada")

    if body.notification_time is not None:
        sub.notification_time = body.notification_time
    if body.enabled is not None:
        sub.enabled = body.enabled

    db.commit()
    return {"ok": True}


@router.post("/test-push", status_code=200)
def test_push(
    user_key: str,
    device_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Envía una notificación de prueba inmediatamente. No modifica last_sent_at."""
    result = send_now(user_key, device_id, db)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/reset-last-sent", status_code=200)
def reset_last_sent(
    user_key: str,
    device_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Resetea last_sent_at para que el scheduler pueda enviar hoy (útil para testear)."""
    sub = _get_sub(db, user_key, device_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada")
    sub.last_sent_at = None
    db.commit()
    return {"ok": True}


@router.delete("/unsubscribe", status_code=200)
def unsubscribe(
    body: OutfitNotificationUnsubscribeRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Elimina la suscripción de este dispositivo."""
    sub = _get_sub(db, body.user_key, body.device_id)
    if sub:
        db.delete(sub)
        db.commit()
    return {"ok": True}
