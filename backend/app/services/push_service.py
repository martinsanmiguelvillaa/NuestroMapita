"""
Servicio de Web Push Notifications usando VAPID.
Envía notificaciones a todas las suscripciones guardadas.
"""
import json
import logging
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


def send_push_to_endpoint(
    endpoint: str,
    p256dh: str,
    auth: str,
    title: str,
    body: str,
    url: str = "/",
) -> bool:
    """
    Envía una notificación push a un endpoint específico.
    Devuelve True si el envío fue exitoso, False si la suscripción es inválida (404/410).
    Propaga otros errores como warning en el log.
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIMS_EMAIL:
        return True  # Sin VAPID configurado, fingimos éxito para no deshabilitar

    try:
        webpush(
            subscription_info={
                "endpoint": endpoint,
                "keys": {"p256dh": p256dh, "auth": auth},
            },
            data=json.dumps({"title": title, "body": body, "url": url}),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"},
        )
        return True
    except WebPushException as e:
        status = e.response.status_code if e.response is not None else None
        if status in (404, 410):
            return False  # Suscripción expirada
        logger.warning("Push error (endpoint=%s): %s", endpoint[:40], e)
        return True  # Error transitorio — no deshabilitar


def send_push_to_all(db: Session, title: str, body: str, url: str = "/") -> None:
    """Envía una notificación push a todas las suscripciones registradas."""
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIMS_EMAIL:
        return

    subscriptions = db.query(PushSubscription).all()
    dead = []

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"},
            )
        except WebPushException as e:
            status = e.response.status_code if e.response is not None else None
            if status in (404, 410):
                # Suscripción expirada o inválida — eliminar
                dead.append(sub.id)
            else:
                logger.warning("Push error (endpoint=%s): %s", sub.endpoint[:40], e)

    if dead:
        db.query(PushSubscription).filter(PushSubscription.id.in_(dead)).delete(
            synchronize_session=False
        )
        db.commit()
