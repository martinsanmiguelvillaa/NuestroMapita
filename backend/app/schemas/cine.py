from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator, model_validator

VALID_TYPES = {"movie", "series"}
VALID_STATUSES = {"to_watch", "watching", "watched"}


# ---------------------------------------------------------------------------
# Comentarios
# ---------------------------------------------------------------------------

class CineCommentCreate(BaseModel):
    author: Optional[str] = None
    text: str

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El comentario no puede estar vacío")
        return v.strip()

    @field_validator("author")
    @classmethod
    def author_strip(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v and v.strip() else None


class CineCommentResponse(BaseModel):
    id: int
    cine_item_id: int
    author: Optional[str]
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Ítems de cine
# ---------------------------------------------------------------------------

class CineItemCreate(BaseModel):
    title: str
    type: str
    status: str = "to_watch"
    poster_url: Optional[str] = None
    synopsis: Optional[str] = None
    genres: Optional[List[str]] = None
    platform: Optional[str] = None
    trailer_url: Optional[str] = None
    year: Optional[str] = None
    rating: Optional[int] = None
    is_favorite: bool = False
    external_source: Optional[str] = None
    external_id: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El título es obligatorio")
        return v.strip()

    @field_validator("type")
    @classmethod
    def type_valid(cls, v: str) -> str:
        if v not in VALID_TYPES:
            raise ValueError('El tipo debe ser "movie" o "series"')
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError('El estado debe ser "to_watch", "watching" o "watched"')
        return v

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("El puntaje debe estar entre 1 y 5")
        return v

    @field_validator("trailer_url")
    @classmethod
    def trailer_url_valid(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            v = v.strip()
            if not (v.startswith("http://") or v.startswith("https://")):
                raise ValueError("El link del tráiler debe ser una URL válida")
            return v
        return None


class CineItemUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    poster_url: Optional[str] = None
    synopsis: Optional[str] = None
    genres: Optional[List[str]] = None
    platform: Optional[str] = None
    trailer_url: Optional[str] = None
    year: Optional[str] = None
    rating: Optional[int] = None
    is_favorite: Optional[bool] = None
    external_source: Optional[str] = None
    external_id: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("El título no puede estar vacío")
        return v.strip() if v else v

    @field_validator("type")
    @classmethod
    def type_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_TYPES:
            raise ValueError('El tipo debe ser "movie" o "series"')
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_STATUSES:
            raise ValueError('El estado debe ser "to_watch", "watching" o "watched"')
        return v

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("El puntaje debe estar entre 1 y 5")
        return v

    @field_validator("trailer_url")
    @classmethod
    def trailer_url_valid(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            v = v.strip()
            if not (v.startswith("http://") or v.startswith("https://")):
                raise ValueError("El link del tráiler debe ser una URL válida")
            return v
        return None


class CineItemResponse(BaseModel):
    id: int
    title: str
    type: str
    status: str
    poster_url: Optional[str]
    synopsis: Optional[str]
    genres: Optional[List[str]]
    platform: Optional[str]
    trailer_url: Optional[str]
    year: Optional[str]
    rating: Optional[int]
    is_favorite: bool
    external_source: Optional[str]
    external_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    comments: List[CineCommentResponse] = []

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def ensure_genres_list(self) -> "CineItemResponse":
        if self.genres is None:
            self.genres = []
        return self
