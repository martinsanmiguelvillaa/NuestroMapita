"""
Servicio de Web Push Notifications usando VAPID.
Envía notificaciones a todas las suscripciones guardadas en device_subscriptions.
"""
import json
import logging
from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfo

from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.device_subscription import DeviceSubscription

logger = logging.getLogger(__name__)

_DEFAULT_TZ = "America/Argentina/Buenos_Aires"


def in_quiet_hours(sub: DeviceSubscription) -> bool:
    """True si el dispositivo está en sus horas de silencio (hora local).

    Soporta rangos que cruzan medianoche (ej. 23:00 → 08:00).
    Sin quiet_start/quiet_end configurados, nunca silencia.
    """
    if not sub.quiet_start or not sub.quiet_end or sub.quiet_start == sub.quiet_end:
        return False
    try:
        tz = ZoneInfo(sub.timezone or _DEFAULT_TZ)
    except Exception:
        tz = ZoneInfo(_DEFAULT_TZ)
    now_hhmm = datetime.now(dt_timezone.utc).astimezone(tz).strftime("%H:%M")
    if sub.quiet_start < sub.quiet_end:
        return sub.quiet_start <= now_hhmm < sub.quiet_end
    # Rango que cruza medianoche
    return now_hhmm >= sub.quiet_start or now_hhmm < sub.quiet_end


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


def _send_to_subs(db: Session, subs: list, title: str, body: str, url: str, icon: str | None = None) -> None:
    """Envía a una lista de suscripciones ya filtradas, deduplicando por endpoint."""
    seen: dict[str, DeviceSubscription] = {}
    for sub in subs:
        if sub.endpoint not in seen:
            seen[sub.endpoint] = sub

    dead_endpoints: list[str] = []
    payload = {"title": title, "body": body, "url": url}
    if icon:
        payload["icon"] = icon

    for endpoint, sub in seen.items():
        try:
            webpush(
                subscription_info={
                    "endpoint": endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=json.dumps(payload),
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


def send_push_to_all(db: Session, title: str, body: str, url: str = "/", priority: str = "normal") -> None:
    """
    Envía a todos los dispositivos habilitados (master switch).
    Para cartitas y otros eventos globales sin preferencia por feature.
    Respeta las horas de silencio, salvo priority="high".
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIMS_EMAIL:
        return

    subs = db.query(DeviceSubscription).filter(
        DeviceSubscription.enabled == True  # noqa: E712
    ).all()

    if priority != "high":
        subs = [s for s in subs if not in_quiet_hours(s)]

    _send_to_subs(db, subs, title, body, url)


_PONI_MESSAGES = [
    "¡Quiero un poni!",
    "Amooor, quiero un poni",
    "Me das un poni?",
    "Ya dije que quiero un poni?",
    "Adoptamos un poni?",
    "Y MI PONI????",
    "PONI PONI PONI",
    "AMOOOOOOOOR QUIERO PONIIIIIIIIII",
    "Quizas tambien un panda... o un unicornio...",
    "Vamos a tener un poni no?",
    "Tenemos un poni?",
]
_poni_bag: list[str] = []


def _next_poni_message() -> str:
    """Devuelve un mensaje aleatorio sin repetir hasta agotar todos."""
    import random
    if not _poni_bag:
        _poni_bag.extend(_PONI_MESSAGES)
        random.shuffle(_poni_bag)
    return _poni_bag.pop()


def send_poni_push_to_all(db: Session) -> None:
    """
    Envía '¡Quiero un poni!' a dispositivos con poni_notif_enabled=True.
    Deshabilitado por defecto (NULL/False = no enviar). Respeta quiet hours.
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIMS_EMAIL:
        return

    subs = db.query(DeviceSubscription).filter(
        DeviceSubscription.enabled == True,          # noqa: E712
        DeviceSubscription.poni_notif_enabled == True,  # noqa: E712
    ).all()

    subs = [s for s in subs if not in_quiet_hours(s)]

    _send_to_subs(db, subs, "Quiero un poni", _next_poni_message(), "/", icon="/icons/config/poni.png")


def send_calendar_push_to_all(db: Session, title: str, body: str, url: str = "/calendario", priority: str = "normal") -> None:
    """
    Envía a dispositivos con notificaciones de calendario habilitadas.
    NULL en calendar_notif_enabled = opt-out no realizado = enviar.
    False = el usuario eligió no recibir notificaciones de calendario en este dispositivo.
    Respeta las horas de silencio, salvo priority="high".
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIMS_EMAIL:
        return

    subs = db.query(DeviceSubscription).filter(
        DeviceSubscription.enabled == True,                    # noqa: E712
        DeviceSubscription.calendar_notif_enabled != False,   # NULL o True
    ).all()

    if priority != "high":
        subs = [s for s in subs if not in_quiet_hours(s)]

    _send_to_subs(db, subs, title, body, url)
