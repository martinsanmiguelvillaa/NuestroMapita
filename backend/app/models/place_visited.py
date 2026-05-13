from sqlalchemy import Column, Integer, String, Text, Date, SmallInteger, Numeric, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PlaceVisited(Base):
    __tablename__ = "places_visited"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    address = Column(String(400), nullable=False)
    visit_date = Column(Date, nullable=False)
    comment = Column(Text, nullable=True)
    rating = Column(SmallInteger, nullable=True)          # 1 a 5
    google_maps_url = Column(String(500), nullable=True)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relación 1:N con fotos (se eliminan en cascada si se borra el lugar)
    photos = relationship("Photo", back_populates="place_visited", cascade="all, delete-orphan")
