from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    place_visited_id = Column(
        Integer,
        ForeignKey("places_visited.id", ondelete="CASCADE"),
        nullable=True,
    )
    place_wishlist_id = Column(
        Integer,
        ForeignKey("places_wishlist.id", ondelete="CASCADE"),
        nullable=True,
    )
    cloudinary_url = Column(String(500), nullable=False)
    cloudinary_public_id = Column(String(200), nullable=False)
    position_x = Column(Integer, nullable=False, default=50, server_default="50")
    position_y = Column(Integer, nullable=False, default=50, server_default="50")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    place_visited = relationship("PlaceVisited", back_populates="photos")
    place_wishlist = relationship("PlaceWishlist", back_populates="photos")
