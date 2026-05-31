"""
Servicio de Web Push Notifications usando VAPID.
Envía notificaciones a todas las suscripciones guardadas en device_subscriptions.
"""
import json
import logging
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.device_subscription import DeviceSubscription

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
        logger.error(
            "Push error status=%s endpoint=%s respuesta=%s",
            status, endpoint[:40], resp_text[:200],
        )
        return True  # Error transitorio — no deshabilitar


def _send_to_subs(db: Session, subs: list, title: str, body: str, url: str) -> None:
    """Envía a una lista de suscripciones ya filtradas, deduplicando por endpoint."""
    seen: dict[str, DeviceSubscription] = {}
    for sub in subs:
        if sub.endpoint not in seen:
            seen[sub.endpoint] = sub

    dead_endpoints: list[str] = []

    for endpoint, sub in seen.items():
        try:
            webpush(
                subscription_info={
                    "endpoint": endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"},
            )
        except WebPushException as e:
            status = e.response.status_code if e.response is not None else None
            if status in (404, 410):
                dead_endpoints.append(endpoint)
            else:
                logger.warning("Push error (endpoint=%s): %s", endpoint[:40], e)

    if dead_endpoints:
        db.query(DeviceSubscription).filter(
            DeviceSubscription.endpoint.in_(dead_endpoints)
        ).update({"enabled": False}, synchronize_session=False)
        db.commit()


def send_push_to_all(db: Session, title: str, body: str, url: str = "/") -> None:
    """
    Envía a todos los dispositivos habilitados (master switch).
    Para cartitas y otros eventos globales sin preferencia por feature.
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIMS_EMAIL:
        return

    subs = db.query(DeviceSubscription).filter(
        DeviceSubscription.enabled == True  # noqa: E712
    ).all()

    _send_to_subs(db, subs, title, body, url)


def send_calendar_push_to_all(db: Session, title: str, body: str, url: str = "/calendario") -> None:
    """
    Envía a dispositivos con notificaciones de calendario habilitadas.
    NULL en calendar_notif_enabled = opt-out no realizado = enviar.
    False = el usuario eligió no recibir notificaciones de calendario en este dispositivo.
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIMS_EMAIL:
        return

    subs = db.query(DeviceSubscription).filter(
        DeviceSubscription.enabled == True,                    # noqa: E712
        DeviceSubscription.calendar_notif_enabled != False,   # NULL o True
    ).all()

    _send_to_subs(db, subs, title, body, url)
