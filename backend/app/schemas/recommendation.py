from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Request ────────────────────────────────────────────────────────────────


class RecommendationRequest(BaseModel):
    type: Optional[str] = None          # "movie" | "series" | None = any
    moods: list[str] = []
    extra_text: Optional[str] = None
    include_watchlist: bool = False


# ── Recommendation item (returned by OpenAI + stored in history) ───────────


class RecommendationItem(BaseModel):
    title: str
    type: str                           # "movie" | "series"
    year: Optional[str] = None
    genres: list[str] = []
    synopsis_short: Optional[str] = None
    reason: Optional[str] = None


class RecommendationResult(BaseModel):
    main: RecommendationItem
    similar: list[RecommendationItem]


# ── History ────────────────────────────────────────────────────────────────


class RecommendationHistoryResponse(BaseModel):
    id: int
    request_type: Optional[str]
    request_moods: Optional[list[str]]
    request_extra: Optional[str]
    main_title: str
    recommendations: dict               # raw JSON (main + similar)
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Blocked ────────────────────────────────────────────────────────────────


class BlockedCreate(BaseModel):
    title: str


class BlockedResponse(BaseModel):
    id: int
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}
