from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.name import Name, NameRating
from app.schemas.name import (
    NameCreate, NameUpdate, NameResponse,
    RateNameRequest, NameRatingResponse, NameRankingEntry,
)

router = APIRouter(prefix="/names", tags=["Nombres"])


def _normalize(text: str) -> str:
    return text.strip().lower()


def _match_label(diff: int) -> str:
    if diff == 0:
        return "match_perfecto"
    if diff <= 2:
        return "muy_buen_acuerdo"
    if diff <= 4:
        return "gusta_a_ambos"
    return "opiniones_divididas"


def _build_ranking_entry(name: Name) -> NameRankingEntry:
    ratings = {r.person: r.rating for r in name.ratings}
    martin = ratings.get("martin")
    van = ratings.get("van")
    is_complete = martin is not None and van is not None

    if is_complete:
        avg = (martin + van) / 2
        diff = abs(martin - van)
        score = round(avg - diff * 0.25, 2)
        label = _match_label(diff)
    else:
        avg = diff = score = None
        if martin is None and van is not None:
            label = "pendiente_martin"
        elif van is None and martin is not None:
            label = "pendiente_van"
        else:
            label = "sin_puntuar"

    return NameRankingEntry(
        id=name.id,
        text=name.text,
        gender=name.gender,
        note=name.note,
        martin_rating=martin,
        van_rating=van,
        average=round(avg, 2) if avg is not None else None,
        difference=diff,
        combined_score=score,
        match_label=label,
        is_complete=is_complete,
    )


# IMPORTANTE: /ranking debe ir antes de /{name_id} para que FastAPI no trate
# "ranking" como un entero.
@router.get("/ranking", response_model=List[NameRankingEntry])
def get_ranking(
    gender: Optional[str] = Query(None),
    include_incomplete: bool = Query(False),
    sort: str = Query("combined", description="combined | average | difference | martin | van"),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Devuelve el ranking combinado de nombres."""
    query = db.query(Name).options(selectinload(Name.ratings))
    if gender and gender != "all":
        query = query.filter(Name.gender == gender)

    entries = [_build_ranking_entry(n) for n in query.all()]

    if not include_incomplete:
        entries = [e for e in entries if e.is_complete]

    _SORT_KEY = {
        "combined":   lambda e: (e.combined_score is None,  -(e.combined_score or 0)),
        "average":    lambda e: (e.average is None,          -(e.average or 0)),
        "difference": lambda e: (e.difference is None,        (e.difference if e.difference is not None else 999)),
        "martin":     lambda e: (e.martin_rating is None,    -(e.martin_rating or 0)),
        "van":        lambda e: (e.van_rating is None,       -(e.van_rating or 0)),
    }
    entries.sort(key=_SORT_KEY.get(sort, _SORT_KEY["combined"]))
    return entries


@router.get("", response_model=List[NameResponse])
def list_names(
    gender: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Lista todos los nombres con sus puntuaciones."""
    query = db.query(Name).options(selectinload(Name.ratings))
    if gender and gender != "all":
        query = query.filter(Name.gender == gender)
    return query.order_by(Name.text).all()


@router.post("", response_model=NameResponse, status_code=201)
def create_name(
    data: NameCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Crea un nuevo nombre. Falla con 409 si ya existe (case-insensitive)."""
    norm = _normalize(data.text)
    if db.query(Name).filter(Name.text_normalized == norm).first():
        raise HTTPException(status_code=409, detail=f"El nombre '{data.text}' ya existe")

    name = Name(text=data.text, text_normalized=norm, gender=data.gender, note=data.note)
    db.add(name)
    db.commit()
    db.refresh(name)
    return name


@router.put("/{name_id}", response_model=NameResponse)
def update_name(
    name_id: int,
    data: NameUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    name = db.query(Name).options(selectinload(Name.ratings)).filter(Name.id == name_id).first()
    if not name:
        raise HTTPException(status_code=404, detail="Nombre no encontrado")

    if data.text is not None:
        norm = _normalize(data.text)
        conflict = db.query(Name).filter(Name.text_normalized == norm, Name.id != name_id).first()
        if conflict:
            raise HTTPException(status_code=409, detail=f"El nombre '{conflict.text}' ya existe")
        name.text = data.text
        name.text_normalized = norm

    if data.gender is not None:
        name.gender = data.gender
    if data.note is not None:
        name.note = data.note

    db.commit()
    db.refresh(name)
    return name


@router.delete("/{name_id}", status_code=204)
def delete_name(
    name_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    name = db.query(Name).filter(Name.id == name_id).first()
    if not name:
        raise HTTPException(status_code=404, detail="Nombre no encontrado")
    db.delete(name)
    db.commit()


@router.post("/{name_id}/rate", response_model=NameRatingResponse)
def rate_name(
    name_id: int,
    data: RateNameRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Crea o actualiza la puntuación de una persona para un nombre."""
    if not db.query(Name).filter(Name.id == name_id).first():
        raise HTTPException(status_code=404, detail="Nombre no encontrado")

    existing = db.query(NameRating).filter(
        NameRating.name_id == name_id,
        NameRating.person == data.person,
    ).first()

    if existing:
        existing.rating = data.rating
        db.commit()
        db.refresh(existing)
        return existing

    rating = NameRating(name_id=name_id, person=data.person, rating=data.rating)
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating
