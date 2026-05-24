"""
Scheduler para notificaciones push de outfits.

Cada minuto revisa qué suscripciones activas deben recibir su notificación
según el horario configurado y la timezone de cada dispositivo.
"""
import logging
import time
from datetime import datetime, date, timezone as dt_timezone
from zoneinfo import ZoneInfoNotFoundError, ZoneInfo

import requests as http
from apscheduler.schedulers.background import BackgroundScheduler

from app.database import SessionLocal
from app.models.outfit_notification import OutfitNotificationSubscription
from app.services.push_service import send_push_to_endpoint
from app.config import settings

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None

# Cache de sesión reutilizada de outfits (importamos la función helper)
from app.routers.outfits import _ensure_session, _proxy, _auth_header


def _get_outfit_for_user(user_key: str) -> dict | None:
    """Obtiene la recomendación de outfit para el usuario dado."""
    if not settings.OUTFITS_API_URL:
        return None
    try:
        resp = _proxy(
            user_key,
            lambda s: http.get(
                f"{settings.OUTFITS_API_URL}/users/{s['user_id']}/outfit",
                headers=_auth_header(s["token"]),
                timeout=15,
            ),
        )
        if resp.ok:
            return resp.json()
    except Exception as exc:
        logger.warning("No se pudo obtener outfit para %s: %s", user_key, exc)
    return None


def _build_notification(user_key: str, outfit_data: dict | None) -> tuple[str, str]:
    """Arma título y cuerpo de la notificación."""
    user_name = "Van" if user_key == "van" else "Martín"

    if not outfit_data:
        return (
            f"Tu outfit de hoy 💌",
            f"Entrá a Nuestro Mapita para ver tu recomendación personalizada.",
        )

    # Intentar extraer info del clima y recomendación
    weather = outfit_data.get("weather", {})
    outfit = outfit_data.get("outfit", {})

    temp = weather.get("temperature") or weather.get("temp")
    city = weather.get("city", "Buenos Aires")
    summary = outfit.get("summary") or outfit.get("recommendation", "")

    if temp and summary:
        body = f"{temp}°C en {city}. {summary}"
    elif summary:
        body = summary
    elif temp:
        body = f"Hace {temp}°C en {city}. Revisá tu recomendación."
    else:
        body = "Tu recomendación personalizada te está esperando."

    # Recortar si es muy largo para la notificación
    if len(body) > 120:
        body = body[:117] + "..."

    return f"Tu outfit de hoy 💌", body


def _check_and_send() -> None:
    """Job principal: revisa suscripciones activas y envía las que correspondan."""
    db = SessionLocal()
    try:
        now_utc = datetime.now(dt_timezone.utc)
        subs = db.query(OutfitNotificationSubscription).filter_by(enabled=True).all()

        for sub in subs:
            try:
                # Convertir hora actual a la timezone del usuario
                try:
                    tz = ZoneInfo(sub.timezone)
                except ZoneInfoNotFoundError:
                    tz = ZoneInfo("America/Argentina/Buenos_Aires")

                now_local = now_utc.astimezone(tz)
                current_hhmm = now_local.strftime("%H:%M")
                today = now_local.date()

                # ¿Coincide el horario configurado?
                if current_hhmm != sub.notification_time:
                    continue

                # ¿Ya se envió hoy?
                if sub.last_sent_at:
                    last_sent_local = sub.last_sent_at.replace(tzinfo=dt_timezone.utc).astimezone(tz)
                    if last_sent_local.date() == today:
                        continue

                # Obtener recomendación y enviar
                outfit_data = _get_outfit_for_user(sub.user_key)
                title, body = _build_notification(sub.user_key, outfit_data)

                user_key = sub.user_key
                url = f"/outfits?user={user_key}"

                success = send_push_to_endpoint(
                    endpoint=sub.endpoint,
                    p256dh=sub.p256dh,
                    auth=sub.auth,
                    title=title,
                    body=body,
                    url=url,
                )

                if success:
                    sub.last_sent_at = datetime.utcnow()
                    db.commit()
                    logger.info(
                        "Notificación de outfit enviada → user=%s device=%s",
                        sub.user_key,
                        sub.device_id[:8],
                    )
                else:
                    # Suscripción expirada — deshabilitar
                    sub.enabled = False
                    db.commit()
                    logger.info(
                        "Suscripción expirada deshabilitada → user=%s device=%s",
                        sub.user_key,
                        sub.device_id[:8],
                    )

            except Exception as exc:
                logger.warning("Error procesando suscripción id=%s: %s", sub.id, exc)

    except Exception as exc:
        logger.error("Error en job de notificaciones de outfits: %s", exc)
    finally:
        db.close()


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler(timezone="UTC")
    # Corre cada minuto en el segundo 0
    _scheduler.add_job(_check_and_send, "cron", second=0, id="outfit_notifications")
    _scheduler.start()
    logger.info("Scheduler de notificaciones de outfits iniciado.")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler de notificaciones de outfits detenido.")
