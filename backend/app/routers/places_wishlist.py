import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.place_wishlist import PlaceWishlist
from app.models.place_visited import PlaceVisited
from app.models.photo import Photo
from app.schemas.place_wishlist import (
    PlaceWishlistCreate, PlaceWishlistUpdate,
    PlaceWishlistResponse, ConvertToVisitedRequest, ReorderRequest,
)
from app.schemas.place_visited import PlaceVisitedResponse

router = APIRouter(prefix="/places/wishlist", tags=["Lugares por visitar"])


@router.put("/reorder", status_code=200)
def reorder_all(
    data: ReorderRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Reordena toda la lista de una vez. Recibe los IDs en el nuevo orden deseado."""
    if not data.ordered_ids:
        return {"ok": True}
    # Validar que todos los IDs existan
    existing_ids = {
        row.id for row in db.query(PlaceWishlist.id).filter(PlaceWishlist.id.in_(data.ordered_ids)).all()
    }
    missing = [pid for pid in data.ordered_ids if pid not in existing_ids]
    if missing:
        raise HTTPException(status_code=422, detail=f"IDs no encontrados: {missing}")
    # Validar que lleguen TODOS los lugares (evita order_index inconsistente)
    total = db.query(func.count(PlaceWishlist.id)).scalar()
    if len(data.ordered_ids) != total:
        raise HTTPException(
            status_code=422,
            detail=f"Se esperaban {total} IDs pero se recibieron {len(data.ordered_ids)}"
        )
    for index, place_id in enumerate(data.ordered_ids):
        db.query(PlaceWishlist).filter(PlaceWishlist.id == place_id).update(
            {"order_index": index}
        )
    db.commit()
    return {"ok": True}


@router.get("/random", response_model=PlaceWishlistResponse)
def get_random(
    exclude_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Elige un lugar al azar de la lista de pendientes, opcionalmente excluyendo uno."""
    places = db.query(PlaceWishlist).all()
    if not places:
        raise HTTPException(status_code=404, detail="No hay lugares por visitar todavía")
    candidates = [p for p in places if p.id != exclude_id]
    # Si solo hay uno y es el excluido, igual lo devolvemos
    return random.choice(candidates if candidates else places)


@router.get("", response_model=List[PlaceWishlistResponse])
def list_wishlist(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Lista los lugares por visitar ordenados por order_index."""
    query = db.query(PlaceWishlist)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                PlaceWishlist.name.ilike(s),
                PlaceWishlist.address.ilike(s),
                PlaceWishlist.description.ilike(s),
            )
        )
    return query.order_by(PlaceWishlist.order_index.asc()).all()


@router.post("", response_model=PlaceWishlistResponse, status_code=201)
def create_wishlist(
    data: PlaceWishlistCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Agrega un nuevo lugar a la lista. Se agrega al final."""
    max_order = db.query(func.max(PlaceWishlist.order_index)).scalar() or 0
    place = PlaceWishlist(**data.model_dump(), order_index=max_order + 1)
    db.add(place)
    db.commit()
    db.refresh(place)
    return place


@router.get("/{place_id}", response_model=PlaceWishlistResponse)
def get_wishlist(
    place_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    place = db.query(PlaceWishlist).filter(PlaceWishlist.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")
    return place


@router.put("/{place_id}", response_model=PlaceWishlistResponse)
def update_wishlist(
    place_id: int,
    data: PlaceWishlistUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    place = db.query(PlaceWishlist).filter(PlaceWishlist.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(place, field, value)
    db.commit()
    db.refresh(place)
    return place


@router.delete("/{place_id}", status_code=204)
def delete_wishlist(
    place_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    place = db.query(PlaceWishlist).filter(PlaceWishlist.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")
    db.delete(place)
    db.commit()


@router.patch("/{place_id}/order", status_code=200)
def reorder(
    place_id: int,
    direction: str = Query(..., description="up | down | top | bottom"),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Mueve un lugar en la lista: up, down, top, bottom."""
    place = db.query(PlaceWishlist).filter(PlaceWishlist.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")

    if direction == "top":
        min_order = db.query(func.min(PlaceWishlist.order_index)).scalar() or 0
        place.order_index = min_order - 1

    elif direction == "bottom":
        max_order = db.query(func.max(PlaceWishlist.order_index)).scalar() or 0
        place.order_index = max_order + 1

    elif direction == "up":
        prev = (
            db.query(PlaceWishlist)
            .filter(PlaceWishlist.order_index < place.order_index, PlaceWishlist.id != place_id)
            .order_by(PlaceWishlist.order_index.desc())
            .first()
        )
        if prev:
            place.order_index, prev.order_index = prev.order_index, place.order_index

    elif direction == "down":
        nxt = (
            db.query(PlaceWishlist)
            .filter(PlaceWishlist.order_index > place.order_index, PlaceWishlist.id != place_id)
            .order_by(PlaceWishlist.order_index.asc())
            .first()
        )
        if nxt:
            place.order_index, nxt.order_index = nxt.order_index, place.order_index

    else:
        raise HTTPException(status_code=400, detail="Dirección inválida. Usar: up, down, top, bottom")

    db.commit()
    return {"ok": True}


@router.post("/{place_id}/convert", response_model=PlaceVisitedResponse)
def convert_to_visited(
    place_id: int,
    data: ConvertToVisitedRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """
    Convierte un lugar por visitar en visitado.
    Crea un registro en places_visited y elimina de places_wishlist.
    """
    wish = db.query(PlaceWishlist).filter(PlaceWishlist.id == place_id).first()
    if not wish:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")

    visited = PlaceVisited(
        name=wish.name,
        address=wish.address,
        google_maps_url=wish.google_maps_url,
        latitude=wish.latitude,
        longitude=wish.longitude,
        # El comentario inicial puede venir de la descripción del wishlist
        comment=data.comment or wish.description,
        visit_date=data.visit_date,
        rating=data.rating,
        source="wishlist",
    )
    db.add(visited)
    db.flush()  # obtener visited.id antes del commit

    # Reasignar fotos al nuevo lugar visitado para evitar que el cascade
    # de place_wishlist las borre al hacer db.delete(wish).
    db.query(Photo).filter(Photo.place_wishlist_id == place_id).update(
        {"place_wishlist_id": None, "place_visited_id": visited.id},
        synchronize_session=False,
    )
    # Limpiar la colección en memoria para que el cascade no encuentre fotos que borrar.
    db.expire(wish, ["photos"])

    db.delete(wish)
    db.commit()
    db.refresh(visited)
    return visited
