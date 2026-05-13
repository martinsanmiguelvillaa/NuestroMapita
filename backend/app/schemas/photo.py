from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PhotoResponse(BaseModel):
    id: int
    place_visited_id: int
    cloudinary_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
