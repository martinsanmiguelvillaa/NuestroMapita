from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.photo import PhotoResponse


class PlaceVisitedCreate(BaseModel):
    name: str
    address: Optional[str] = None
    visit_date: Optional[date] = None
    comment: Optional[str] = None
    rating: Optional[int] = None
    google_maps_url: Optional[str] = None
    would_revisit: Optional[bool] = None
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


class PlaceVisitedUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    visit_date: Optional[date] = None
    comment: Optional[str] = None
    rating: Optional[int] = None
    google_maps_url: Optional[str] = None
    would_revisit: Optional[bool] = None
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
    address: Optional[str]
    visit_date: Optional[date]
    comment: Optional[str]
    rating: Optional[int]
    google_maps_url: Optional[str]
    would_revisit: Optional[bool]
    latitude: Optional[Decimal]
    longitude: Optional[Decimal]
    source: Optional[str]
    created_at: datetime
    updated_at: datetime
    photos: List[PhotoResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
