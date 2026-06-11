from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    user_key: str
    type: str
    title: str
    body: Optional[str]
    url: Optional[str]
    source_type: Optional[str]
    source_id: Optional[int]
    priority: str
    read_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class UnreadCountResponse(BaseModel):
    count: int
