from sqlalchemy import Column, Integer, String, Text, SmallInteger, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Name(Base):
    __tablename__ = "names"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    text = Column(String(100), nullable=False)
    text_normalized = Column(String(100), nullable=False, unique=True)  # lowercase+strip para dedup
    gender = Column(String(20), nullable=False)  # 'male' | 'female' | 'unisex'
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    ratings = relationship("NameRating", back_populates="name", cascade="all, delete-orphan")


class NameRating(Base):
    __tablename__ = "name_ratings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name_id = Column(Integer, ForeignKey("names.id", ondelete="CASCADE"), nullable=False)
    person = Column(String(20), nullable=False)  # 'martin' | 'van'
    rating = Column(SmallInteger, nullable=False)  # 1–10
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    name = relationship("Name", back_populates="ratings")

    __table_args__ = (
        UniqueConstraint("name_id", "person", name="uq_name_rating_person"),
    )
