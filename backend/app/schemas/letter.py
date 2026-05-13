from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class LetterCreate(BaseModel):
    title: str
    body: str
    letter_date: Optional[date] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("El título es obligatorio")
        return v.strip()

    @field_validator("body")
    @classmethod
    def body_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("El mensaje es obligatorio")
        return v.strip()


class LetterUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    letter_date: Optional[date] = None


class LetterResponse(BaseModel):
    id: int
    title: str
    body: str
    letter_date: Optional[date]
    photo_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
