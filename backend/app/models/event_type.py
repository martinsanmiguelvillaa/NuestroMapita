from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String
from app.database import Base


class EventType(Base):
    __tablename__ = "event_types"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(100), nullable=False)
    color      = Column(String(20), nullable=False, default="#CFC4B8")
    created_by = Column(String(20), nullable=False)   # "van" | "martin"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
