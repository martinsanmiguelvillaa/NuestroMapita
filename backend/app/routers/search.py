from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.dependencies import get_current_user
from app.models.place_visited import PlaceVisited
from app.models.place_wishlist import PlaceWishlist
from app.models.letter import Letter
from app.schemas.place_visited import PlaceVisitedResponse
from app.schemas.place_wishlist import PlaceWishlistResponse
from app.schemas.letter import LetterResponse

router = APIRouter(prefix="/search", tags=["Búsqueda"])


@router.get("")
def global_search(
    q: str = Query(..., min_length=1, description="Texto a buscar"),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Búsqueda global en lugares visitados, por visitar y cartitas."""
    s = f"%{q}%"

    visited = db.query(PlaceVisited).filter(
        or_(
            PlaceVisited.name.ilike(s),
            PlaceVisited.address.ilike(s),
            PlaceVisited.comment.ilike(s),
        )
    ).all()

    wishlist = db.query(PlaceWishlist).filter(
        or_(
            PlaceWishlist.name.ilike(s),
            PlaceWishlist.address.ilike(s),
            PlaceWishlist.description.ilike(s),
        )
    ).all()

    letters = db.query(Letter).filter(
        or_(
            Letter.title.ilike(s),
            Letter.body.ilike(s),
        )
    ).all()

    return {
        "query": q,
        "visited": [PlaceVisitedResponse.model_validate(p) for p in visited],
        "wishlist": [PlaceWishlistResponse.model_validate(p) for p in wishlist],
        "letters": [LetterResponse.model_validate(p) for p in letters],
    }
