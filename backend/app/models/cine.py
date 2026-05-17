from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, SmallInteger, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CineItem(Base):
    __tablename__ = "cine_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(300), nullable=False)
    type = Column(String(10), nullable=False)                   # 'movie' | 'series'
    status = Column(String(10), nullable=False, default="to_watch")  # 'to_watch' | 'watched'
    poster_url = Column(String(500), nullable=True)
    synopsis = Column(Text, nullable=True)
    genres = Column(JSON, nullable=True)                        # ["Drama", "Romance"]
    platform = Column(String(200), nullable=True)
    trailer_url = Column(String(500), nullable=True)
    year = Column(String(10), nullable=True)
    rating = Column(SmallInteger, nullable=True)                # 1–5 puntaje conjunto
    is_favorite = Column(Boolean, nullable=False, default=False)
    external_source = Column(String(20), nullable=True)         # 'tmdb' | 'manual'
    external_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    comments = relationship(
        "CineComment",
        back_populates="cine_item",
        cascade="all, delete-orphan",
        order_by="CineComment.created_at",
    )


class CineComment(Base):
    __tablename__ = "cine_comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cine_item_id = Column(
        Integer,
        ForeignKey("cine_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    author = Column(String(100), nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    cine_item = relationship("CineItem", back_populates="comments")
