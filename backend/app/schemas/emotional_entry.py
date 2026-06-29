from typing import Optional
from pydantic import BaseModel, field_validator
import re
from datetime import date as date_type

VALID_EMOTIONS = {
    "quiero-un-poni",
    "feliz", "enamorado", "tranquilo", "emocionado", "agradecido",
    "nostalgico", "ansioso", "triste", "cansado", "estresado",
    "irritado", "solo", "confundido", "asustado", "orgulloso",
}

VALID_USER_KEYS = {"van", "martin"}


class EmotionalEntryUpsertRequest(BaseModel):
    user_key: str
    date: str          # "YYYY-MM-DD"
    emotion_key: str
    intensity: int     # 1-5
    note: Optional[str] = None

    @field_validator("user_key")
    @classmethod
    def validate_user_key(cls, v: str) -> str:
        if v not in VALID_USER_KEYS:
            raise ValueError("user_key debe ser 'van' o 'martin'")
        return v

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("date debe tener formato YYYY-MM-DD")
        return v

    @field_validator("emotion_key")
    @classmethod
    def validate_emotion(cls, v: str) -> str:
        if v not in VALID_EMOTIONS:
            raise ValueError(f"emotion_key inválido: {v}")
        return v

    @field_validator("intensity")
    @classmethod
    def validate_intensity(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("intensity debe estar entre 1 y 5")
        return v


class EmotionalEntryUpdateRequest(BaseModel):
    emotion_key: str
    intensity: int
    note: Optional[str] = None

    @field_validator("emotion_key")
    @classmethod
    def validate_emotion(cls, v: str) -> str:
        if v not in VALID_EMOTIONS:
            raise ValueError(f"emotion_key inválido: {v}")
        return v

    @field_validator("intensity")
    @classmethod
    def validate_intensity(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("intensity debe estar entre 1 y 5")
        return v


class EmotionalEntryResponse(BaseModel):
    id: int
    user_key: str
    date: str
    emotion_key: str
    intensity: int
    note: Optional[str]

    model_config = {"from_attributes": True}
