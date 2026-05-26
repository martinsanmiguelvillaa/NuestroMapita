"""
Endpoints para el Emocionario — diario emocional compartido.
Regla: 1 registro por (user_key, date). Upsert en POST.
"""
from datetime import date as date_type
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.emotional_entry import EmotionalEntry
from app.schemas.emotional_entry import EmotionalEntryUpsertRequest, EmotionalEntryResponse

router = APIRouter(prefix="/emocionario", tags=["Emocionario"])


@router.post("/", response_model=EmotionalEntryResponse, status_code=200)
def upsert_entry(
    body: EmotionalEntryUpsertRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Crea o actualiza la entrada del día para un usuario. No permite fechas futuras."""
    today = date_type.today().isoformat()
    if body.date > today:
        raise HTTPException(status_code=400, detail="No se pueden registrar emociones en fechas futuras.")

    entry = (
        db.query(EmotionalEntry)
        .filter_by(user_key=body.user_key, date=body.date)
        .first()
    )
    if entry:
        entry.emotion_key = body.emotion_key
        entry.intensity = body.intensity
        entry.note = body.note
    else:
        entry = EmotionalEntry(
            user_key=body.user_key,
            date=body.date,
            emotion_key=body.emotion_key,
            intensity=body.intensity,
            note=body.note,
        )
        db.add(entry)

    db.commit()
    db.refresh(entry)
    return entry


@router.get("/", response_model=list[EmotionalEntryResponse])
def list_entries(
    month: Optional[str] = Query(None, description="Filtrar por mes YYYY-MM"),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Lista todas las entradas, opcionalmente filtradas por mes (YYYY-MM)."""
    q = db.query(EmotionalEntry)
    if month:
        q = q.filter(EmotionalEntry.date.like(f"{month}-%"))
    return q.order_by(EmotionalEntry.date.desc()).all()


@router.delete("/{entry_id}", status_code=200)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Elimina una entrada por ID."""
    entry = db.query(EmotionalEntry).filter_by(id=entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    db.delete(entry)
    db.commit()
    return {"ok": True}
