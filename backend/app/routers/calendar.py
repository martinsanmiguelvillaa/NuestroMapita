"""
Nuestro Calendario — eventos compartidos + tipos de evento.
El Emocionario sigue en /emocionario; este router maneja CalendarEvent y EventType.
"""
import json
import uuid
from calendar import monthrange
from datetime import date as date_type, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.calendar_event import CalendarEvent
from app.models.event_type import EventType
from app.schemas.calendar import (
    CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse,
    EventTypeCreate, EventTypeUpdate, EventTypeResponse,
)

router = APIRouter(prefix="/calendario", tags=["Nuestro Calendario"])


# ─── Helpers de recurrencia ───────────────────────────────────────────────────

def expand_event_for_month(event: CalendarEvent, year: int, month: int) -> list[dict]:
    """Devuelve las instancias de un evento recurrente que caen en el mes dado."""
    if not event.recurrence:
        return []
    try:
        rule = json.loads(event.recurrence)
    except Exception:
        return []

    freq = rule.get("freq", "none")
    if freq == "none":
        return []

    interval     = int(rule.get("interval", 1))
    end_date_str = rule.get("end_date")
    occurrences  = rule.get("occurrences")
    days_of_week = rule.get("days", [])   # [0=Mon..6=Sun]

    start = date_type.fromisoformat(event.date)
    _, last_day = monthrange(year, month)
    month_start = date_type(year, month, 1)
    month_end   = date_type(year, month, last_day)

    end_limit = date_type.fromisoformat(end_date_str) if end_date_str else date_type(year + 5, 1, 1)

    instances = []
    count = 0

    if freq == "daily":
        current = start
        while current <= month_end and current <= end_limit:
            if occurrences and count >= occurrences:
                break
            if current >= month_start:
                instances.append(current.isoformat())
            current += timedelta(days=interval)
            count += 1

    elif freq == "weekly":
        # days_of_week may specify which days; if empty, use the start's weekday
        target_days = days_of_week if days_of_week else [start.weekday()]
        current = start
        while current <= month_end and current <= end_limit:
            if occurrences and count >= occurrences:
                break
            if current >= month_start and current.weekday() in target_days:
                instances.append(current.isoformat())
                count += 1
            current += timedelta(days=1)

    elif freq == "monthly":
        # Same day-of-month each month
        d = date_type(year, month, min(start.day, last_day))
        if start <= d <= end_limit and d >= month_start:
            if not occurrences or ((d.year - start.year) * 12 + (d.month - start.month)) // interval < occurrences:
                instances.append(d.isoformat())

    elif freq == "yearly":
        if start.month == month:
            d = date_type(year, month, min(start.day, last_day))
            if d >= start and d <= end_limit:
                if not occurrences or (d.year - start.year) // interval < occurrences:
                    instances.append(d.isoformat())

    elif freq == "custom":
        # Tratar igual que weekly si hay días, sino daily con intervalo
        if days_of_week:
            current = start
            while current <= month_end and current <= end_limit:
                if occurrences and count >= occurrences:
                    break
                if current >= month_start and current.weekday() in days_of_week:
                    instances.append(current.isoformat())
                    count += 1
                current += timedelta(days=1)
        else:
            current = start
            while current <= month_end and current <= end_limit:
                if occurrences and count >= occurrences:
                    break
                if current >= month_start:
                    instances.append(current.isoformat())
                current += timedelta(days=interval)
                count += 1

    # Excluir la fecha original (ya aparece como evento normal) y fechas excluidas
    exdates = set(rule.get("exdates", []))
    return [d for d in instances if d != event.date and d not in exdates]


def events_for_range(db: Session, year: int, month: int) -> list[dict]:
    """Retorna todos los eventos (normales + instancias recurrentes) para el mes."""
    _, last_day = monthrange(year, month)
    prefix = f"{year:04d}-{month:02d}-"
    month_start = f"{year:04d}-{month:02d}-01"
    month_end   = f"{year:04d}-{month:02d}-{last_day:02d}"

    # Eventos que caen directamente en el mes
    direct = db.query(CalendarEvent).filter(
        CalendarEvent.date >= month_start,
        CalendarEvent.date <= month_end,
    ).all()

    # Eventos recurrentes que comenzaron antes del mes
    recurring = db.query(CalendarEvent).filter(
        CalendarEvent.recurrence.isnot(None),
        CalendarEvent.date < month_start,
    ).all()

    def _exdates(ev: CalendarEvent) -> set:
        if not ev.recurrence:
            return set()
        try:
            return set(json.loads(ev.recurrence).get("exdates", []))
        except Exception:
            return set()

    results = [
        _event_to_dict(e, e.date)
        for e in direct
        if e.date not in _exdates(e)
    ]

    # También expandir eventos directos que tienen recurrencia (el start ya está, agrega el resto)
    for ev in direct:
        if ev.recurrence:
            for inst_date in expand_event_for_month(ev, year, month):
                results.append(_event_to_dict(ev, inst_date))

    for ev in recurring:
        for inst_date in expand_event_for_month(ev, year, month):
            results.append(_event_to_dict(ev, inst_date))

    return results


def _event_to_dict(event: CalendarEvent, instance_date: str) -> dict:
    d = {c.name: getattr(event, c.name) for c in event.__table__.columns}
    d["instance_date"] = instance_date   # fecha real de esta instancia
    return d


# ─── EventType endpoints ──────────────────────────────────────────────────────

@router.get("/types", response_model=List[EventTypeResponse])
def list_types(
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    return db.query(EventType).order_by(EventType.name).all()


@router.post("/types", response_model=EventTypeResponse, status_code=201)
def create_type(
    data: EventTypeCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    et = EventType(**data.model_dump())
    db.add(et)
    db.commit()
    db.refresh(et)
    return et


@router.put("/types/{type_id}", response_model=EventTypeResponse)
def update_type(
    type_id: int,
    data: EventTypeUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    et = db.query(EventType).filter_by(id=type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(et, field, value)
    db.commit()
    db.refresh(et)
    return et


@router.delete("/types/{type_id}", status_code=200)
def delete_type(
    type_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    et = db.query(EventType).filter_by(id=type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    # Desligar eventos que usan este tipo
    db.query(CalendarEvent).filter_by(type_id=type_id).update({"type_id": None})
    db.delete(et)
    db.commit()
    return {"ok": True}


# ─── CalendarEvent endpoints ──────────────────────────────────────────────────

@router.get("/events")
def list_events(
    month: Optional[str] = Query(None, description="YYYY-MM"),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Lista eventos del mes, expandiendo recurrentes."""
    if month:
        try:
            year, mon = int(month[:4]), int(month[5:7])
        except Exception:
            raise HTTPException(status_code=400, detail="Formato de mes inválido, usar YYYY-MM")
        return events_for_range(db, year, mon)

    # Sin filtro: devuelve todos los eventos base (sin expansión)
    return [_event_to_dict(e, e.date) for e in db.query(CalendarEvent).order_by(CalendarEvent.date).all()]


@router.post("/events", response_model=CalendarEventResponse, status_code=201)
def create_event(
    data: CalendarEventCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    payload = data.model_dump()
    # Asignar series_id si es recurrente
    if data.recurrence:
        try:
            rule = json.loads(data.recurrence)
            if rule.get("freq", "none") != "none" and not payload.get("series_id"):
                payload["series_id"] = str(uuid.uuid4())
        except Exception:
            pass
    event = CalendarEvent(**payload)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/events/{event_id}", response_model=CalendarEventResponse)
def update_event(
    event_id: int,
    data: CalendarEventUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    event = db.query(CalendarEvent).filter_by(id=event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=200)
def delete_event(
    event_id: int,
    delete_series: bool = Query(False, description="Eliminar toda la serie recurrente"),
    instance_date: Optional[str] = Query(None, description="Fecha de la instancia a excluir (solo este)"),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    event = db.query(CalendarEvent).filter_by(id=event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    if delete_series:
        if event.series_id:
            db.query(CalendarEvent).filter_by(series_id=event.series_id).delete()
        else:
            db.delete(event)
    elif event.recurrence and instance_date:
        # Excluir solo esta instancia agregando la fecha a exdates
        rule = json.loads(event.recurrence)
        exdates = rule.get("exdates", [])
        if instance_date not in exdates:
            exdates.append(instance_date)
        rule["exdates"] = exdates
        event.recurrence = json.dumps(rule)
    else:
        db.delete(event)

    db.commit()
    return {"ok": True}
