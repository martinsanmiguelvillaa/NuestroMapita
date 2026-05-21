from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.photo import PhotoResponse


class PlaceTripCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    google_maps_url: Optional[str] = None
    social_url: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("El nombre es obligatorio")
        return v.strip()


class PlaceTripUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    google_maps_url: Optional[str] = None
    social_url: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None


class PlaceTripResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    address: Optional[str]
    google_maps_url: Optional[str]
    social_url: Optional[str]
    latitude: Optional[Decimal]
    longitude: Optional[Decimal]
    order_index: int
    created_at: datetime
    updated_at: datetime
    photos: List[PhotoResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class TripReorderRequest(BaseModel):
    ordered_ids: List[int]


class TripConvertToVisitedRequest(BaseModel):
    visit_date: date
    comment: Optional[str] = None
    rating: Optional[int] = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if v is not None and not (1 <= v <= 5):
            raise ValueError("El rating debe ser entre 1 y 5")
        return v
