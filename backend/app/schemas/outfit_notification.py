from typing import Optional
from pydantic import BaseModel, field_validator
import re


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionInfo(BaseModel):
    endpoint: str
    keys: PushKeys


class OutfitNotificationSubscribeRequest(BaseModel):
    user_key: str
    device_id: str
    subscription: PushSubscriptionInfo
    notification_time: str = "09:00"   # "HH:MM"
    timezone: str = "America/Argentina/Buenos_Aires"
    device_label: Optional[str] = None

    @field_validator("user_key")
    @classmethod
    def validate_user_key(cls, v: str) -> str:
        if v not in ("van", "martin"):
            raise ValueError("user_key debe ser 'van' o 'martin'")
        return v

    @field_validator("notification_time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        if not re.match(r"^\d{2}:\d{2}$", v):
            raise ValueError("notification_time debe tener formato HH:MM")
        hh, mm = int(v[:2]), int(v[3:])
        if not (0 <= hh <= 23 and 0 <= mm <= 59):
            raise ValueError("Hora inválida")
        return v


class OutfitNotificationSettingsRequest(BaseModel):
    user_key: str
    device_id: str
    notification_time: Optional[str] = None
    enabled: Optional[bool] = None

    @field_validator("notification_time")
    @classmethod
    def validate_time(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^\d{2}:\d{2}$", v):
            raise ValueError("notification_time debe tener formato HH:MM")
        hh, mm = int(v[:2]), int(v[3:])
        if not (0 <= hh <= 23 and 0 <= mm <= 59):
            raise ValueError("Hora inválida")
        return v


class OutfitNotificationUnsubscribeRequest(BaseModel):
    user_key: str
    device_id: str


class OutfitNotificationStatusResponse(BaseModel):
    exists: bool
    enabled: bool
    notification_time: Optional[str]
    timezone: Optional[str]
    device_label: Optional[str]
