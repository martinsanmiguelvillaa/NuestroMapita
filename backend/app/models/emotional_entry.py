from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, SmallInteger, String, Text, UniqueConstraint
from app.database import Base


class EmotionalEntry(Base):
    __tablename__ = "emotional_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_key = Column(String(20), nullable=False)          # "van" | "martin"
    date = Column(String(10), nullable=False)              # "YYYY-MM-DD"
    emotion_key = Column(String(50), nullable=False)       # key de la emoción fija
    intensity = Column(SmallInteger, nullable=False)       # 1-5
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("user_key", "date", "emotion_key", name="uq_emotional_user_date_emotion"),
    )
