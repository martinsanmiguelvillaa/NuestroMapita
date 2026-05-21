import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.place_trip import PlaceTrip
from app.models.place_visited import PlaceVisited
from app.models.photo import Photo
from app.schemas.place_trip import (
    PlaceTripCreate, PlaceTripUpdate,
    PlaceTripResponse, TripConvertToVisitedRequest, TripReorderRequest,
)
from app.schemas.place_visited import PlaceVisitedResponse

router = APIRouter(prefix="/trips", tags=["Viajecitos"])


@router.put("/reorder", status_code=200)
def reorder_all(
    data: TripReorderRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    for index, place_id in enumerate(data.ordered_ids):
        db.query(PlaceTrip).filter(PlaceTrip.id == place_id).update(
            {"order_index": index}
        )
    db.commit()
    return {"ok": True}


@router.get("/random", response_model=PlaceTripResponse)
def get_random(
    exclude_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    trips = db.query(PlaceTrip).all()
    if not trips:
        raise HTTPException(status_code=404, detail="No hay viajecitos todavía")
    candidates = [t for t in trips if t.id != exclude_id]
    return random.choice(candidates if candidates else trips)


@router.get("", response_model=List[PlaceTripResponse])
def list_trips(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    query = db.query(PlaceTrip)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                PlaceTrip.name.ilike(s),
                PlaceTrip.address.ilike(s),
                PlaceTrip.description.ilike(s),
            )
        )
    return query.order_by(PlaceTrip.order_index.asc()).all()


@router.post("", response_model=PlaceTripResponse, status_code=201)
def create_trip(
    data: PlaceTripCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    max_order = db.query(func.max(PlaceTrip.order_index)).scalar() or 0
    trip = PlaceTrip(**data.model_dump(), order_index=max_order + 1)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.get("/{trip_id}", response_model=PlaceTripResponse)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    trip = db.query(PlaceTrip).filter(PlaceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viajecito no encontrado")
    return trip


@router.put("/{trip_id}", response_model=PlaceTripResponse)
def update_trip(
    trip_id: int,
    data: PlaceTripUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    trip = db.query(PlaceTrip).filter(PlaceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viajecito no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(trip, field, value)
    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/{trip_id}", status_code=204)
def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    trip = db.query(PlaceTrip).filter(PlaceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viajecito no encontrado")
    db.delete(trip)
    db.commit()


@router.patch("/{trip_id}/order", status_code=200)
def reorder(
    trip_id: int,
    direction: str = Query(..., description="up | down | top | bottom"),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    trip = db.query(PlaceTrip).filter(PlaceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viajecito no encontrado")

    if direction == "top":
        min_order = db.query(func.min(PlaceTrip.order_index)).scalar() or 0
        trip.order_index = min_order - 1

    elif direction == "bottom":
        max_order = db.query(func.max(PlaceTrip.order_index)).scalar() or 0
        trip.order_index = max_order + 1

    elif direction == "up":
        prev = (
            db.query(PlaceTrip)
            .filter(PlaceTrip.order_index < trip.order_index, PlaceTrip.id != trip_id)
            .order_by(PlaceTrip.order_index.desc())
            .first()
        )
        if prev:
            trip.order_index, prev.order_index = prev.order_index, trip.order_index

    elif direction == "down":
        nxt = (
            db.query(PlaceTrip)
            .filter(PlaceTrip.order_index > trip.order_index, PlaceTrip.id != trip_id)
            .order_by(PlaceTrip.order_index.asc())
            .first()
        )
        if nxt:
            trip.order_index, nxt.order_index = nxt.order_index, trip.order_index

    else:
        raise HTTPException(status_code=400, detail="Dirección inválida. Usar: up, down, top, bottom")

    db.commit()
    return {"ok": True}


@router.post("/{trip_id}/convert", response_model=PlaceVisitedResponse)
def convert_to_visited(
    trip_id: int,
    data: TripConvertToVisitedRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Convierte un viajecito en lugar visitado. Transfiere fotos y elimina el viajecito."""
    trip = db.query(PlaceTrip).filter(PlaceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viajecito no encontrado")

    visited = PlaceVisited(
        name=trip.name,
        address=trip.address,
        google_maps_url=trip.google_maps_url,
        latitude=trip.latitude,
        longitude=trip.longitude,
        comment=data.comment or trip.description,
        visit_date=data.visit_date,
        rating=data.rating,
    )
    db.add(visited)
    db.flush()

    db.query(Photo).filter(Photo.place_trip_id == trip_id).update(
        {"place_trip_id": None, "place_visited_id": visited.id},
        synchronize_session=False,
    )
    db.expire(trip, ["photos"])

    db.delete(trip)
    db.commit()
    db.refresh(visited)
    return visited
