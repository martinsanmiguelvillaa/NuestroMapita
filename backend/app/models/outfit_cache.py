from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text
from app.database import Base


class OutfitCache(Base):
    __tablename__ = "outfit_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_key = Column(String(20), nullable=False, unique=True)
    outfit_data = Column(Text, nullable=False)   # JSON del objeto outfit
    weather_data = Column(Text, nullable=False)  # JSON del objeto weather
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
