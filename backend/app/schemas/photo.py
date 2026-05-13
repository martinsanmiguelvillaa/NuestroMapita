from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PhotoPositionUpdate(BaseModel):
    x: int
    y: int


class PhotoResponse(BaseModel):
    id: int
    place_visited_id: Optional[int] = None
    place_wishlist_id: Optional[int] = None
    cloudinary_url: str
    position_x: int = 50
    position_y: int = 50
    sort_order: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
