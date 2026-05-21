from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PlaceTrip(Base):
    __tablename__ = "places_trips"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    address = Column(String(400), nullable=True)
    google_maps_url = Column(String(500), nullable=True)
    social_url = Column(String(500), nullable=True)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    photos = relationship("Photo", back_populates="place_trip", cascade="all, delete-orphan",
                          order_by="Photo.sort_order, Photo.created_at")
