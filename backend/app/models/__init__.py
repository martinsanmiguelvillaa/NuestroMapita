# Importar todos los modelos para que Alembic y SQLAlchemy los registren
from app.models.place_visited import PlaceVisited
from app.models.photo import Photo
from app.models.place_wishlist import PlaceWishlist
from app.models.letter import Letter

__all__ = ["PlaceVisited", "Photo", "PlaceWishlist", "Letter"]
