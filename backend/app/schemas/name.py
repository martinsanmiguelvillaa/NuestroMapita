from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator

VALID_GENDERS = {"male", "female", "unisex"}
VALID_PERSONS = {"martin", "van"}


class NameRatingResponse(BaseModel):
    id: int
    name_id: int
    person: str
    rating: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class NameCreate(BaseModel):
    text: str
    gender: str
    note: Optional[str] = None

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("El nombre es obligatorio")
        return v.strip()

    @field_validator("gender")
    @classmethod
    def gender_valid(cls, v):
        if v not in VALID_GENDERS:
            raise ValueError(f"Género inválido. Opciones: {sorted(VALID_GENDERS)}")
        return v


class NameUpdate(BaseModel):
    text: Optional[str] = None
    gender: Optional[str] = None
    note: Optional[str] = None

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip() if v else v

    @field_validator("gender")
    @classmethod
    def gender_valid(cls, v):
        if v is not None and v not in VALID_GENDERS:
            raise ValueError(f"Género inválido. Opciones: {sorted(VALID_GENDERS)}")
        return v


class NameResponse(BaseModel):
    id: int
    text: str
    gender: str
    note: Optional[str]
    created_at: datetime
    updated_at: datetime
    ratings: List[NameRatingResponse] = []
    model_config = ConfigDict(from_attributes=True)


class RateNameRequest(BaseModel):
    person: str
    rating: int

    @field_validator("person")
    @classmethod
    def person_valid(cls, v):
        if v not in VALID_PERSONS:
            raise ValueError("Persona inválida. Debe ser 'martin' o 'van'")
        return v

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if not (1 <= v <= 10):
            raise ValueError("El rating debe estar entre 1 y 10")
        return v


class NameRankingEntry(BaseModel):
    id: int
    text: str
    gender: str
    note: Optional[str]
    martin_rating: Optional[int]
    van_rating: Optional[int]
    average: Optional[float]
    difference: Optional[int]
    combined_score: Optional[float]
    match_label: Optional[str]
    is_complete: bool
