import json
import re
from typing import Optional
from pydantic import BaseModel, field_validator
from datetime import datetime

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^\d{2}:\d{2}$")
VALID_PARTICIPANTS = {"martin", "van", "ambos"}
VALID_USERS = {"martin", "van"}
VALID_FREQS = {"none", "daily", "weekly", "monthly", "yearly", "custom"}

# ─── EventType ────────────────────────────────────────────────────────────────

class EventTypeCreate(BaseModel):
    name: str
    color: str = "#CFC4B8"
    created_by: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()

    @field_validator("created_by")
    @classmethod
    def valid_user(cls, v):
        if v not in VALID_USERS:
            raise ValueError("created_by debe ser 'van' o 'martin'")
        return v


class EventTypeUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip() if v else v


class EventTypeResponse(BaseModel):
    id: int
    name: str
    color: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── CalendarEvent ────────────────────────────────────────────────────────────

class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str                           # YYYY-MM-DD
    start_time: Optional[str] = None    # HH:MM
    end_time: Optional[str] = None      # HH:MM
    all_day: bool = True
    type_id: Optional[int] = None
    participants: str = "ambos"
    created_by: str
    notif_enabled: bool = False
    notif_minutes: Optional[int] = None
    recurrence: Optional[str] = None    # JSON string
    series_id: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("El título no puede estar vacío")
        return v.strip()

    @field_validator("date")
    @classmethod
    def valid_date(cls, v):
        if not DATE_RE.match(v):
            raise ValueError("Formato de fecha inválido, usar YYYY-MM-DD")
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def valid_time(cls, v):
        if v is not None and not TIME_RE.match(v):
            raise ValueError("Formato de hora inválido, usar HH:MM")
        return v

    @field_validator("participants")
    @classmethod
    def valid_participants(cls, v):
        if v not in VALID_PARTICIPANTS:
            raise ValueError("participants debe ser 'martin', 'van' o 'ambos'")
        return v

    @field_validator("created_by")
    @classmethod
    def valid_user(cls, v):
        if v not in VALID_USERS:
            raise ValueError("created_by debe ser 'van' o 'martin'")
        return v

    @field_validator("recurrence")
    @classmethod
    def valid_recurrence(cls, v):
        if v is None:
            return v
        try:
            data = json.loads(v)
            freq = data.get("freq", "none")
            if freq not in VALID_FREQS:
                raise ValueError(f"freq inválido: {freq}")
        except json.JSONDecodeError:
            raise ValueError("recurrence debe ser JSON válido")
        return v


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    all_day: Optional[bool] = None
    type_id: Optional[int] = None
    participants: Optional[str] = None
    notif_enabled: Optional[bool] = None
    notif_minutes: Optional[int] = None
    recurrence: Optional[str] = None

    @field_validator("date")
    @classmethod
    def valid_date(cls, v):
        if v is not None and not DATE_RE.match(v):
            raise ValueError("Formato de fecha inválido, usar YYYY-MM-DD")
        return v

    @field_validator("participants")
    @classmethod
    def valid_participants(cls, v):
        if v is not None and v not in VALID_PARTICIPANTS:
            raise ValueError("participants debe ser 'martin', 'van' o 'ambos'")
        return v


class CalendarEventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    date: str
    start_time: Optional[str]
    end_time: Optional[str]
    all_day: bool
    type_id: Optional[int]
    participants: str
    created_by: str
    notif_enabled: bool
    notif_minutes: Optional[int]
    recurrence: Optional[str]
    series_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
