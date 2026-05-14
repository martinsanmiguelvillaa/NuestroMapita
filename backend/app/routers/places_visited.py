from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.dependencies import get_current_user
from app.models.place_visited import PlaceVisited
from app.models.place_wishlist import PlaceWishlist
from app.schemas.place_visited import PlaceVisitedCreate, PlaceVisitedUpdate, PlaceVisitedResponse
from app.schemas.place_wishlist import PlaceWishlistResponse
from app.services.cloudinary_service import delete_image

router = APIRouter(prefix="/places/visited", tags=["Lugares visitados"])


@router.get("", response_model=List[PlaceVisitedResponse])
def list_visited(
    sort: str = Query("newest", description="newest | oldest | rating"),
    search: Optional[str] = Query(None),
    revisit: Optional[bool] = Query(None, description="true = solo los que volvería a visitar"),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Lista todos los lugares visitados con filtros opcionales."""
    query = db.query(PlaceVisited)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                PlaceVisited.name.ilike(s),
                PlaceVisited.address.ilike(s),
                PlaceVisited.comment.ilike(s),
            )
        )

    if revisit is not None:
        query = query.filter(PlaceVisited.would_revisit == revisit)

    if sort == "oldest":
        query = query.order_by(PlaceVisited.visit_date.asc())
    elif sort == "rating":
        # nullslast no es compatible con todas las versiones de MySQL;
        # rating IS NULL devuelve 0 (no nulo) o 1 (nulo), ordenando nulos al final
        query = query.order_by(PlaceVisited.rating.is_(None), PlaceVisited.rating.desc())
    else:  # newest
        query = query.order_by(PlaceVisited.visit_date.desc())

    return query.all()


@router.post("", response_model=PlaceVisitedResponse, status_code=201)
def create_visited(
    data: PlaceVisitedCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Crea un nuevo lugar visitado."""
    place = PlaceVisited(**data.model_dump())
    db.add(place)
    db.commit()
    db.refresh(place)
    return place


@router.get("/{place_id}", response_model=PlaceVisitedResponse)
def get_visited(
    place_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Obtiene un lugar visitado por ID."""
    place = db.query(PlaceVisited).filter(PlaceVisited.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")
    return place


@router.put("/{place_id}", response_model=PlaceVisitedResponse)
def update_visited(
    place_id: int,
    data: PlaceVisitedUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Actualiza los datos de un lugar visitado."""
    place = db.query(PlaceVisited).filter(PlaceVisited.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(place, field, value)

    db.commit()
    db.refresh(place)
    return place


@router.delete("/{place_id}", status_code=204)
def delete_visited(
    place_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Elimina un lugar visitado y sus fotos en Cloudinary y base de datos."""
    place = db.query(PlaceVisited).filter(PlaceVisited.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")

    for photo in place.photos:
        try:
            delete_image(photo.cloudinary_public_id)
        except Exception:
            pass

    db.delete(place)
    db.commit()


@router.post("/{place_id}/convert-back", response_model=PlaceWishlistResponse, status_code=201)
def convert_back_to_wishlist(
    place_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Devuelve un lugar visitado a la lista de por visitar."""
    place = db.query(PlaceVisited).filter(PlaceVisited.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")

    wish = PlaceWishlist(
        name=place.name,
        description=place.comment,
        address=place.address,
        google_maps_url=place.google_maps_url,
        latitude=place.latitude,
        longitude=place.longitude,
    )
    db.add(wish)
    db.flush()  # obtener wish.id antes del commit

    for photo in place.photos:
        photo.place_visited_id = None
        photo.place_wishlist_id = wish.id

    db.delete(place)
    db.commit()
    db.refresh(wish)
    return wish
