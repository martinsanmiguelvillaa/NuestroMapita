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
        nullable=False,
    )
    cloudinary_url = Column(String(500), nullable=False)       # URL pública de la imagen
    cloudinary_public_id = Column(String(200), nullable=False) # ID para borrarla de Cloudinary
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    place_visited = relationship("PlaceVisited", back_populates="photos")
