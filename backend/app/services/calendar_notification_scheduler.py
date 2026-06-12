"""
Scheduler para notificaciones push de eventos del calendario.

Cada minuto revisa eventos con notif_enabled=True y envía la notificación
al conjunto completo de dispositivos suscritos cuando corresponde el horario.
"""
import json
import logging
from datetime import datetime, timezone as dt_timezone, date as date_type, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from app.database import SessionLocal
from app.models.calendar_event import CalendarEvent
from app.services.push_service import send_calendar_push_to_all
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None

# Zona horaria de la app (ambos usuarios están en Buenos Aires)
APP_TZ = ZoneInfo("America/Argentina/Buenos_Aires")


def _instances_today(event: CalendarEvent, today: date_type) -> bool:
    """
    Devuelve True si el evento tiene una instancia que ocurre hoy.
    Cubre eventos simples, rangos y recurrentes.
    """
    start = date_type.fromisoformat(event.date)

    # Evento sin recurrencia — solo la fecha de inicio
    if not event.recurrence:
        return start == today

    try:
        rule = json.loads(event.recurrence)
    except Exception:
        return start == today

    freq = rule.get("freq", "none")

    # Rango (un solo bloque de días, freq=daily con end_date)
    if freq == "daily" and rule.get("end_date"):
        end = date_type.fromisoformat(rule["end_date"])
        return start <= today <= end

    # Sin recurrencia real
    if freq == "none":
        return start == today

    # Verificar límites de la serie
    end_date_str = rule.get("end_date")
    end_limit = date_type.fromisoformat(end_date_str) if end_date_str else date_type(today.year + 5, 1, 1)
    if today > end_limit:
        return False
    if today < start:
        return False

    interval = int(rule.get("interval", 1))
    occurrences = rule.get("occurrences")
    exdates = set(rule.get("exdates", []))
    today_str = today.isoformat()

    if today_str in exdates:
        return False

    if freq == "daily":
        delta = (today - start).days
        if delta < 0 or delta % interval != 0:
            return False
        if occurrences and delta // interval >= occurrences:
            return False
        return True

    if freq == "weekly":
        days_of_week = rule.get("days", [start.weekday()])
        if today.weekday() not in days_of_week:
            return False
        # Count occurrences up to today
        count = 0
        current = start
        while current <= today:
            if current.weekday() in days_of_week and current >= start:
                if current == today:
                    if occurrences and count >= occurrences:
                        return False
                    return True
                count += 1
            current += timedelta(days=1)
        return False

    if freq == "monthly":
        if today.day != start.day:
            return False
        months_diff = (today.year - start.year) * 12 + (today.month - start.month)
        if months_diff < 0 or months_diff % interval != 0:
            return False
        if occurrences and months_diff // interval >= occurrences:
            return False
        return True

    if freq == "yearly":
        if today.month != start.month or today.day != start.day:
            return False
        years_diff = today.year - start.year
        if years_diff < 0 or years_diff % interval != 0:
            return False
        if occurrences and years_diff // interval >= occurrences:
            return False
        return True

    if freq == "custom":
        days_of_week = rule.get("days", [])
        if days_of_week:
            if today.weekday() not in days_of_week:
                return False
            count = 0
            current = start
            while current <= today:
                if current.weekday() in days_of_week and current >= start:
                    if current == today:
                        if occurrences and count >= occurrences:
                            return False
                        return True
                    count += 1
                current += timedelta(days=1)
            return False
        else:
            delta = (today - start).days
            if delta < 0 or delta % interval != 0:
                return False
            if occurrences and delta // interval >= occurrences:
                return False
            return True

    return False


def _check_and_send() -> None:
    """Job principal: envía notificaciones de calendario que correspondan ahora."""
    db = SessionLocal()
    try:
        now_local = datetime.now(APP_TZ)
        today = now_local.date()
        current_hhmm = now_local.strftime("%H:%M")

        events = db.query(CalendarEvent).filter(
            CalendarEvent.notif_enabled == True,  # noqa: E712
            CalendarEvent.start_time.isnot(None),
            CalendarEvent.notif_minutes.isnot(None),
        ).all()

        if not events:
            return

        for event in events:
            try:
                if not _instances_today(event, today):
                    continue

                # Calcular el momento de disparo: start_time - notif_minutes
                h, m = map(int, event.start_time.split(":"))
                event_dt = now_local.replace(
                    hour=h, minute=m, second=0, microsecond=0,
                )
                fire_dt = event_dt - timedelta(minutes=event.notif_minutes)
                fire_hhmm = fire_dt.strftime("%H:%M")

                if fire_hhmm != current_hhmm:
                    continue

                # Registrar primero en el historial (campanita). La dedupe_key
                # hace el envío idempotente: si ya existe (job duplicado por
                # redeploy, o ya enviado hoy), NO se manda el push de nuevo.
                # El body usa la hora del evento (no "en X min") para que
                # siga teniendo sentido al leerlo más tarde.
                try:
                    notif = create_notification(
                        db,
                        user_key="ambos",
                        type="calendar_reminder",
                        title=f"📅 {event.title}",
                        body=f"Hoy a las {event.start_time}",
                        url="/calendario",
                        source_type="calendar_event",
                        source_id=event.id,
                        dedupe_key=f"calendar:{event.id}:{today.isoformat()}",
                    )
                except Exception:
                    logger.warning("[calendar-notif] no se pudo registrar en historial (event=%s)", event.id)
                    db.rollback()
                    notif = True  # si falla el historial, el push sale igual

                if notif is None:
                    continue  # dedupe: ya se notificó esta instancia hoy

                send_calendar_push_to_all(
                    db=db,
                    title=f"📅 {event.title}",
                    body=(
                        f"En {event.notif_minutes} min"
                        if event.notif_minutes > 1
                        else "Ahora"
                    ),
                )

            except Exception:
                pass

    except Exception:
        pass
    finally:
        db.close()


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(_check_and_send, "cron", second=0, id="calendar_notifications")
    _scheduler.start()
    logger.info("Scheduler de notificaciones de calendario iniciado — job cada minuto.")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler de notificaciones de calendario detenido.")
