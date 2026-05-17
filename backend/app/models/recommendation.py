from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, func
from app.database import Base


class RecommendationHistory(Base):
    __tablename__ = "recommendation_history"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    request_type = Column(String(10), nullable=True)          # movie | series | None
    request_moods = Column(JSON, nullable=True)               # list[str]
    request_extra = Column(Text, nullable=True)
    main_title = Column(String(300), nullable=False)          # for quick display
    recommendations = Column(JSON, nullable=False)            # full {main, similar}
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class BlockedRecommendation(Base):
    __tablename__ = "blocked_recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title = Column(String(300), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
