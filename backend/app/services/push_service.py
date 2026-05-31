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
        resp_text = e.response.text if e.response is not None else "(sin respuesta)"
        if status in (404, 410):
            return False  # Suscripción expirada
        # 401/403 = VAPID key mismatch — la suscripción fue creada con otra clave pública
        logger.error(
            "Push error status=%s endpoint=%s respuesta=%s",
            status, endpoint[:40], resp_text[:200],
        )
        return True  # Error transitorio — no deshabilitar


def send_push_to_all(db: Session, title: str, body: str, url: str = "/") -> None:
    """
    Envía una notificación push a todos los endpoints registrados en el sistema.
    Incluye push_subscriptions (tabla genérica) y outfit_notification_subscriptions
    (donde se registran los dispositivos al activar notificaciones de outfits).
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIMS_EMAIL:
        return

    from app.models.outfit_notification import OutfitNotificationSubscription

    # Recolectar endpoints únicos de ambas tablas
    # {endpoint: (p256dh, auth, source, id)}
    endpoints: dict[str, tuple] = {}

    for sub in db.query(PushSubscription).all():
        endpoints[sub.endpoint] = (sub.p256dh, sub.auth, "generic", sub.id)

    for sub in db.query(OutfitNotificationSubscription).filter_by(enabled=True).all():
        if sub.endpoint not in endpoints:
            endpoints[sub.endpoint] = (sub.p256dh, sub.auth, "outfit", sub.id)

    dead_generic: list[int] = []
    dead_outfit: list[int]  = []

    for endpoint, (p256dh, auth, source, sub_id) in endpoints.items():
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
        except WebPushException as e:
            status = e.response.status_code if e.response is not None else None
            if status in (404, 410):
                if source == "generic":
                    dead_generic.append(sub_id)
                else:
                    dead_outfit.append(sub_id)
            else:
                logger.warning("Push error (endpoint=%s): %s", endpoint[:40], e)

    if dead_generic:
        db.query(PushSubscription).filter(PushSubscription.id.in_(dead_generic)).delete(
            synchronize_session=False
        )
    if dead_outfit:
        db.query(OutfitNotificationSubscription).filter(
            OutfitNotificationSubscription.id.in_(dead_outfit)
        ).update({"enabled": False}, synchronize_session=False)
    if dead_generic or dead_outfit:
        db.commit()
