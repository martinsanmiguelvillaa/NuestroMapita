"""
Endpoints para gestionar notificaciones push de outfits por usuario y dispositivo.
Usa device_subscriptions (tabla unificada). Cada suscripción es única por (user_key, device_id).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.device_subscription import DeviceSubscription
from app.services.outfit_notification_scheduler import send_now
from app.services.notification_service import reset_outfit_daily_state
from app.config import settings
from app.schemas.outfit_notification import (
    OutfitNotificationSubscribeRequest,
    OutfitNotificationSettingsRequest,
    OutfitNotificationUnsubscribeRequest,
    OutfitNotificationStatusResponse,
)

router = APIRouter(prefix="/outfits/notifications", tags=["Outfit Notifications"])


def _get_sub(db: Session, user_key: str, device_id: str) -> DeviceSubscription | None:
    return (
        db.query(DeviceSubscription)
        .filter_by(user_key=user_key, device_id=device_id)
        .first()
    )


@router.post("/subscribe", status_code=200)
def subscribe(
    body: OutfitNotificationSubscribeRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Crea o actualiza la suscripción de outfit para un usuario en un dispositivo específico."""
    sub = _get_sub(db, body.user_key, body.device_id)

    if sub:
        sub.endpoint = body.subscription.endpoint
        sub.p256dh = body.subscription.keys.p256dh
        sub.auth = body.subscription.keys.auth
        if body.notification_time != sub.outfit_notif_time:
            # Cambió la hora: habilitar re-envío hoy (push + campanita)
            reset_outfit_daily_state(db, sub, commit=False)
        sub.outfit_notif_time = body.notification_time
        sub.timezone = body.timezone
        sub.enabled = True
        sub.outfit_notif_enabled = True
        if body.device_label:
            sub.device_label = body.device_label
    else:
        sub = DeviceSubscription(
            user_key=body.user_key,
            device_id=body.device_id,
            endpoint=body.subscription.endpoint,
            p256dh=body.subscription.keys.p256dh,
            auth=body.subscription.keys.auth,
            outfit_notif_time=body.notification_time,
            timezone=body.timezone,
            enabled=True,
            outfit_notif_enabled=True,
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
    """Devuelve el estado de las notificaciones de outfit para este usuario y dispositivo."""
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
        enabled=sub.outfit_notif_enabled or False,
        notification_time=sub.outfit_notif_time,
        timezone=sub.timezone,
        device_label=sub.device_label,
    )


@router.patch("/settings", status_code=200)
def update_settings(
    body: OutfitNotificationSettingsRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Actualiza horario o estado enabled de outfit de una suscripción existente."""
    sub = _get_sub(db, body.user_key, body.device_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada")

    if body.notification_time is not None:
        if body.notification_time != sub.outfit_notif_time:
            # Cambió la hora: habilitar re-envío hoy (push + campanita)
            reset_outfit_daily_state(db, sub, commit=False)
        sub.outfit_notif_time = body.notification_time
    if body.enabled is not None:
        sub.outfit_notif_enabled = body.enabled

    db.commit()
    return {"ok": True}


@router.post("/test-push", status_code=200)
def test_push(
    user_key: str,
    device_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Envía una notificación de prueba inmediatamente. No modifica outfit_last_sent_at."""
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIMS_EMAIL:
        raise HTTPException(
            status_code=503,
            detail="VAPID no configurado. Agregá VAPID_PRIVATE_KEY y VAPID_CLAIMS_EMAIL en las variables de entorno del backend y reconstruí el contenedor.",
        )
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
    """Resetea outfit_last_sent_at para que el scheduler pueda enviar hoy (útil para testear)."""
    sub = _get_sub(db, user_key, device_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada")
    sub.outfit_last_sent_at = None
    db.commit()
    return {"ok": True}


@router.delete("/unsubscribe", status_code=200)
def unsubscribe(
    body: OutfitNotificationUnsubscribeRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """
    Desactiva las notificaciones de outfit para este usuario+dispositivo.
    El dispositivo permanece registrado para notificaciones globales (calendario, cartitas).
    """
    sub = _get_sub(db, body.user_key, body.device_id)
    if sub:
        sub.outfit_notif_enabled = False
        sub.outfit_notif_time = None
        db.commit()
    return {"ok": True}
