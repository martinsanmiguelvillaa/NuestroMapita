from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator, HttpUrl

from app.schemas.photo import PhotoResponse


class PlaceVisitedCreate(BaseModel):
    name: str
    address: str
    visit_date: date
    comment: Optional[str] = None
    rating: Optional[int] = None
    google_maps_url: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if v is not None and not (1 <= v <= 5):
            raise ValueError("El rating debe ser entre 1 y 5")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("El nombre es obligatorio")
        return v.strip()

    @field_validator("address")
    @classmethod
    def address_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("La dirección es obligatoria")
        return v.strip()


class PlaceVisitedUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    visit_date: Optional[date] = None
    comment: Optional[str] = None
    rating: Optional[int] = None
    google_maps_url: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if v is not None and not (1 <= v <= 5):
            raise ValueError("El rating debe ser entre 1 y 5")
        return v


class PlaceVisitedResponse(BaseModel):
    id: int
    name: str
    address: str
    visit_date: date
    comment: Optional[str]
    rating: Optional[int]
    google_maps_url: Optional[str]
    latitude: Optional[Decimal]
    longitude: Optional[Decimal]
    created_at: datetime
    updated_at: datetime
    photos: List[PhotoResponse] = []

    model_config = ConfigDict(from_attributes=True)
