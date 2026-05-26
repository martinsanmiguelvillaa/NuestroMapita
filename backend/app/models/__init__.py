# Importar todos los modelos para que Alembic y SQLAlchemy los registren
from app.models.place_visited import PlaceVisited
from app.models.photo import Photo
from app.models.place_wishlist import PlaceWishlist
from app.models.letter import Letter
from app.models.recipe import Recipe, RecipeComment
from app.models.cine import CineItem, CineComment
from app.models.recommendation import RecommendationHistory, BlockedRecommendation
from app.models.push_subscription import PushSubscription
from app.models.outfit_notification import OutfitNotificationSubscription
from app.models.outfit_cache import OutfitCache
from app.models.emotional_entry import EmotionalEntry

__all__ = ["PlaceVisited", "Photo", "PlaceWishlist", "Letter", "Recipe", "RecipeComment", "CineItem", "CineComment", "RecommendationHistory", "BlockedRecommendation", "PushSubscription", "OutfitNotificationSubscription", "OutfitCache", "EmotionalEntry"]
