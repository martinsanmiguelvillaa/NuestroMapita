from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.place_visited import PlaceVisited
from app.models.place_wishlist import PlaceWishlist
from app.models.place_trip import PlaceTrip

router = APIRouter(prefix="/map", tags=["Mapa"])


@router.get("/pins")
def get_map_pins(
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """
    Devuelve todos los pines para el mapa.
    Solo incluye lugares que tienen latitud y longitud cargadas.
    """
    visited = (
        db.query(PlaceVisited)
        .options(selectinload(PlaceVisited.photos))
        .filter(PlaceVisited.latitude.isnot(None), PlaceVisited.longitude.isnot(None))
        .all()
    )

    wishlist = (
        db.query(PlaceWishlist)
        .options(selectinload(PlaceWishlist.photos))
        .filter(PlaceWishlist.latitude.isnot(None), PlaceWishlist.longitude.isnot(None))
        .all()
    )

    trips = (
        db.query(PlaceTrip)
        .options(selectinload(PlaceTrip.photos))
        .filter(PlaceTrip.latitude.isnot(None), PlaceTrip.longitude.isnot(None))
        .all()
    )

    def serialize_photos(photos):
        return [
            {
                "id": ph.id,
                "cloudinary_url": ph.cloudinary_url,
                "resource_type": ph.resource_type,
                "position_x": ph.position_x,
                "position_y": ph.position_y,
            }
            for ph in photos
        ]

    return {
        "visited": [
            {
                "id": p.id,
                "type": "visited",
                "name": p.name,
                "address": p.address,
                "visit_date": p.visit_date.isoformat() if p.visit_date else None,
                "rating": p.rating,
                "comment": p.comment,
                "google_maps_url": p.google_maps_url,
                "lat": float(p.latitude),
                "lon": float(p.longitude),
                "photos": serialize_photos(p.photos),
            }
            for p in visited
        ],
        "wishlist": [
            {
                "id": p.id,
                "type": "wishlist",
                "name": p.name,
                "address": p.address,
                "description": p.description,
                "google_maps_url": p.google_maps_url,
                "social_url": p.social_url,
                "lat": float(p.latitude),
                "lon": float(p.longitude),
                "photos": serialize_photos(p.photos),
            }
            for p in wishlist
        ],
        "trips": [
            {
                "id": p.id,
                "type": "trip",
                "name": p.name,
                "address": p.address,
                "description": p.description,
                "google_maps_url": p.google_maps_url,
                "social_url": p.social_url,
                "lat": float(p.latitude),
                "lon": float(p.longitude),
                "photos": serialize_photos(p.photos),
            }
            for p in trips
        ],
    }
