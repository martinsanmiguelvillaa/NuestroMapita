from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PhotoResponse(BaseModel):
    id: int
    place_visited_id: Optional[int] = None
    place_wishlist_id: Optional[int] = None
    cloudinary_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
