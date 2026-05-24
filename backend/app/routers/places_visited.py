from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_
from app.models.photo import Photo

from app.database import get_db
from app.dependencies import get_current_user
from app.models.place_visited import PlaceVisited
from app.models.place_wishlist import PlaceWishlist
from app.models.place_trip import PlaceTrip
from app.schemas.place_visited import PlaceVisitedCreate, PlaceVisitedUpdate, PlaceVisitedResponse
from app.schemas.place_wishlist import PlaceWishlistResponse
from app.schemas.place_trip import PlaceTripResponse
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
    query = db.query(PlaceVisited).options(selectinload(PlaceVisited.photos))

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

    media_to_delete = [(p.cloudinary_public_id, p.resource_type) for p in place.photos]
    db.delete(place)
    db.commit()

    def _del(args):
        import logging
        try:
            from app.services.cloudinary_service import delete_media
            delete_media(args[0], resource_type=args[1])
        except Exception as e:
            logging.getLogger(__name__).warning(
                "No se pudo eliminar media de Cloudinary: public_id=%s error=%s", args[0], e
            )

    if media_to_delete:
        with ThreadPoolExecutor(max_workers=6) as ex:
            ex.map(_del, media_to_delete)


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

    # Reasignar fotos directamente en la BD para evitar que el cascade="delete-orphan"
    # de la relación PlaceVisited.photos las borre al hacer db.delete(place).
    db.query(Photo).filter(Photo.place_visited_id == place_id).update(
        {"place_visited_id": None, "place_wishlist_id": wish.id},
        synchronize_session=False,
    )
    # Limpiar la colección en memoria para que el cascade no encuentre fotos que borrar.
    db.expire(place, ["photos"])

    db.delete(place)
    db.commit()
    db.refresh(wish)
    return wish


@router.post("/{place_id}/convert-back-to-trip", response_model=PlaceTripResponse, status_code=201)
def convert_back_to_trip(
    place_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Devuelve un lugar visitado (originado desde un viajecito) a la lista de viajecitos."""
    place = db.query(PlaceVisited).filter(PlaceVisited.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")

    trip = PlaceTrip(
        name=place.name,
        description=place.comment,
        address=place.address,
        google_maps_url=place.google_maps_url,
        latitude=place.latitude,
        longitude=place.longitude,
    )
    db.add(trip)
    db.flush()

    db.query(Photo).filter(Photo.place_visited_id == place_id).update(
        {"place_visited_id": None, "place_trip_id": trip.id},
        synchronize_session=False,
    )
    db.expire(place, ["photos"])

    db.delete(place)
    db.commit()
    db.refresh(trip)
    return trip
