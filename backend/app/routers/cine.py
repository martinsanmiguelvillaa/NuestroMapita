from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.cine import CineItem, CineComment
from app.schemas.cine import (
    CineItemCreate,
    CineItemUpdate,
    CineItemResponse,
    CineCommentCreate,
    CineCommentResponse,
)
from app.services import tmdb_service

router = APIRouter(prefix="/cine", tags=["Cine"])


def _get_or_404(item_id: int, db: Session) -> CineItem:
    item = (
        db.query(CineItem)
        .options(selectinload(CineItem.comments))
        .filter(CineItem.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Ítem de cine no encontrado")
    return item


# ---------------------------------------------------------------------------
# TMDB (proxied — el API key queda en el backend)
# ---------------------------------------------------------------------------

@router.get("/tmdb/search")
def tmdb_search(
    q: str = Query(..., min_length=1),
    _: bool = Depends(get_current_user),
):
    """Busca en TMDb y devuelve resultados para que el usuario elija."""
    api_key = settings.TMDB_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="La búsqueda automática no está configurada. Podés cargar los datos manualmente.",
        )
    try:
        return tmdb_service.search(q, api_key)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/tmdb/detail")
def tmdb_detail(
    type: str = Query(..., pattern="^(movie|series)$"),
    tmdb_id: int = Query(...),
    _: bool = Depends(get_current_user),
):
    """Obtiene detalle completo de una película/serie desde TMDb."""
    api_key = settings.TMDB_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="TMDb no configurado.")
    try:
        return tmdb_service.get_detail(tmdb_id, type, api_key)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=List[CineItemResponse])
def list_cine(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    query = db.query(CineItem).options(selectinload(CineItem.comments))
    if status:
        query = query.filter(CineItem.status == status)
    if type:
        query = query.filter(CineItem.type == type)
    if is_favorite is not None:
        query = query.filter(CineItem.is_favorite == is_favorite)
    if search:
        query = query.filter(CineItem.title.ilike(f"%{search}%"))
    return query.order_by(CineItem.created_at.desc()).all()


@router.post("", response_model=CineItemResponse, status_code=201)
def create_cine(
    data: CineItemCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    item = CineItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _get_or_404(item.id, db)


@router.get("/{item_id}", response_model=CineItemResponse)
def get_cine(
    item_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    return _get_or_404(item_id, db)


@router.put("/{item_id}", response_model=CineItemResponse)
def update_cine(
    item_id: int,
    data: CineItemUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    item = _get_or_404(item_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    return _get_or_404(item_id, db)


@router.delete("/{item_id}", status_code=204)
def delete_cine(
    item_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    item = _get_or_404(item_id, db)
    db.delete(item)
    db.commit()


# ---------------------------------------------------------------------------
# Comentarios
# ---------------------------------------------------------------------------

@router.post("/{item_id}/comments", response_model=CineCommentResponse, status_code=201)
def add_comment(
    item_id: int,
    data: CineCommentCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    _get_or_404(item_id, db)
    comment = CineComment(cine_item_id=item_id, **data.model_dump())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{item_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    item_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    comment = (
        db.query(CineComment)
        .filter(
            CineComment.id == comment_id,
            CineComment.cine_item_id == item_id,
        )
        .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    db.delete(comment)
    db.commit()
