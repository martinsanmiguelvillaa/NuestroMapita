"""
Scheduler para notificaciones push de outfits.

Cada minuto revisa los dispositivos habilitados que tienen outfit_notif_enabled=True
y envía la notificación según el horario configurado y la timezone de cada dispositivo.
"""
import json
import logging
import time
from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfoNotFoundError, ZoneInfo

import requests as http
from apscheduler.schedulers.background import BackgroundScheduler

from app.database import SessionLocal
from app.models.device_subscription import DeviceSubscription
from app.services.push_service import send_push_to_endpoint
from app.config import settings

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None

from app.routers.outfits import _proxy, _auth_header


def _fetch_and_cache_outfit(user_key: str, db) -> bool:
    """
    Llama a la API externa, guarda el resultado en outfit_cache y devuelve True si tuvo éxito.
    """
    if not settings.OUTFITS_API_URL:
        return False
    try:
        resp = _proxy(
            user_key,
            lambda s: http.get(
                f"{settings.OUTFITS_API_URL}/users/{s['user_id']}/outfit",
                headers=_auth_header(s["token"]),
                timeout=15,
            ),
        )
        if not resp.ok:
            return False

        from app.models.outfit_cache import OutfitCache

        data = resp.json()
        outfit = data.get("outfit") or data.get("outfit_recommendation") or data
        weather = data.get("weather") or {}

        cache = db.query(OutfitCache).filter_by(user_key=user_key).first()
        if cache:
            cache.outfit_data = json.dumps(outfit)
            cache.weather_data = json.dumps(weather)
            cache.generated_at = datetime.now(dt_timezone.utc).replace(tzinfo=None)
        else:
            cache = OutfitCache(
                user_key=user_key,
                outfit_data=json.dumps(outfit),
                weather_data=json.dumps(weather),
                generated_at=datetime.now(dt_timezone.utc).replace(tzinfo=None),
            )
            db.add(cache)
        db.commit()
        return True

    except Exception as exc:
        logger.warning("[outfit-notif] No se pudo cachear outfit para %s: %s", user_key, exc)
        return False


def send_now(user_key: str, device_id: str, db) -> dict:
    """
    Pre-genera el outfit, lo cachea y envía la notificación de prueba.
    No actualiza outfit_last_sent_at.
    """
    sub = (
        db.query(DeviceSubscription)
        .filter_by(user_key=user_key, device_id=device_id)
        .first()
    )
    if not sub:
        return {"ok": False, "error": "Suscripción no encontrada"}

    _fetch_and_cache_outfit(user_key, db)

    title = "Tu outfit de hoy 💌"
    body = "Ya está lista tu recomendación. Tocá para verla."
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
        return {"ok": True, "title": title, "body": body}
    else:
        sub.enabled = False
        db.commit()
        return {"ok": False, "error": "Suscripción expirada o inválida — fue deshabilitada"}


def _check_and_send() -> None:
    """Job principal: revisa dispositivos activos y envía las notificaciones de outfit que correspondan."""
    db = SessionLocal()
    try:
        now_utc = datetime.now(dt_timezone.utc)
        subs = db.query(DeviceSubscription).filter(
            DeviceSubscription.enabled == True,           # noqa: E712
            DeviceSubscription.outfit_notif_enabled == True,  # noqa: E712
            DeviceSubscription.outfit_notif_time.isnot(None),
            DeviceSubscription.user_key.in_(["van", "martin"]),
        ).all()

        logger.debug("[outfit-notif] job tick UTC=%s subs_activas=%d", now_utc.strftime('%H:%M'), len(subs))

        for sub in subs:
            try:
                try:
                    tz = ZoneInfo(sub.timezone)
                except ZoneInfoNotFoundError:
                    tz = ZoneInfo("America/Argentina/Buenos_Aires")

                now_local = now_utc.astimezone(tz)
                current_hhmm = now_local.strftime("%H:%M")

                logger.debug(
                    "[outfit-notif] user=%s device=%s hora_local=%s hora_config=%s",
                    sub.user_key, sub.device_id[:8], current_hhmm, sub.outfit_notif_time,
                )

                if current_hhmm != sub.outfit_notif_time:
                    continue

                # Pre-generar y cachear el outfit antes de notificar
                _fetch_and_cache_outfit(sub.user_key, db)

                title = "Tu outfit de hoy 💌"
                body = "Ya está lista tu recomendación. Tocá para verla."
                url = f"/outfits?user={sub.user_key}"

                success = send_push_to_endpoint(
                    endpoint=sub.endpoint,
                    p256dh=sub.p256dh,
                    auth=sub.auth,
                    title=title,
                    body=body,
                    url=url,
                )

                if success:
                    sub.outfit_last_sent_at = datetime.now(dt_timezone.utc).replace(tzinfo=None)
                    db.commit()
                    logger.info("[outfit-notif] ✓ enviado user=%s device=%s", sub.user_key, sub.device_id[:8])
                else:
                    sub.enabled = False
                    db.commit()
                    logger.warning("[outfit-notif] ✗ suscripción expirada → deshabilitada user=%s device=%s", sub.user_key, sub.device_id[:8])

            except Exception as exc:
                logger.error("[outfit-notif] ERROR suscripción id=%s: %s", sub.id, exc)

    except Exception as exc:
        logger.error("[outfit-notif] ERROR general: %s", exc)
    finally:
        db.close()


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(_check_and_send, "cron", second=0, id="outfit_notifications")
    _scheduler.start()
    logger.info("Scheduler de notificaciones de outfits iniciado — job cada minuto.")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler de notificaciones de outfits detenido.")
