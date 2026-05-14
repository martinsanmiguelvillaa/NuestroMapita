from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator, model_validator

VALID_CATEGORIES = {"salado", "dulce"}


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

class RecipeCommentCreate(BaseModel):
    author: Optional[str] = None
    text: str
    rating: Optional[int] = None

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El comentario no puede estar vacío")
        return v.strip()

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("El puntaje debe estar entre 1 y 5")
        return v


class RecipeCommentResponse(BaseModel):
    id: int
    recipe_id: int
    author: Optional[str]
    text: str
    rating: Optional[int]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Recipes
# ---------------------------------------------------------------------------

class RecipeCreate(BaseModel):
    title: str
    category: str
    ingredients: str
    steps: str
    video_url: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El título es obligatorio")
        return v.strip()

    @field_validator("category")
    @classmethod
    def category_valid(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError('La categoría debe ser "salado" o "dulce"')
        return v

    @field_validator("ingredients")
    @classmethod
    def ingredients_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Los ingredientes son obligatorios")
        return v.strip()

    @field_validator("steps")
    @classmethod
    def steps_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("La preparación es obligatoria")
        return v.strip()

    @field_validator("video_url")
    @classmethod
    def video_url_valid(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            v = v.strip()
            if not (v.startswith("http://") or v.startswith("https://")):
                raise ValueError("El link de video debe ser una URL válida")
            return v
        return None


class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    ingredients: Optional[str] = None
    steps: Optional[str] = None
    video_url: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("El título no puede estar vacío")
        return v.strip() if v else v

    @field_validator("category")
    @classmethod
    def category_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_CATEGORIES:
            raise ValueError('La categoría debe ser "salado" o "dulce"')
        return v

    @field_validator("video_url")
    @classmethod
    def video_url_valid(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            v = v.strip()
            if not (v.startswith("http://") or v.startswith("https://")):
                raise ValueError("El link de video debe ser una URL válida")
            return v
        return None


class RecipeResponse(BaseModel):
    id: int
    title: str
    category: str
    image_url: Optional[str]
    image_public_id: Optional[str]
    ingredients: str
    steps: str
    video_url: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    comments: List[RecipeCommentResponse] = []
    avg_rating: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def compute_avg_rating(self) -> "RecipeResponse":
        ratings = [c.rating for c in self.comments if c.rating is not None]
        if ratings:
            self.avg_rating = round(sum(ratings) / len(ratings), 1)
        return self
