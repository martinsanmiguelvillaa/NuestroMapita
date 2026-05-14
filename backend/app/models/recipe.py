from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    category = Column(String(10), nullable=False)   # 'salado' | 'dulce'
    image_url = Column(String(500), nullable=True)
    image_public_id = Column(String(200), nullable=True)
    ingredients = Column(Text, nullable=False)       # Una línea por ingrediente
    steps = Column(Text, nullable=False)             # Preparación completa
    video_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    comments = relationship(
        "RecipeComment",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeComment.created_at",
    )


class RecipeComment(Base):
    __tablename__ = "recipe_comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    recipe_id = Column(
        Integer,
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=False,
    )
    author = Column(String(100), nullable=True)
    text = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)          # 1-5, opcional
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    recipe = relationship("Recipe", back_populates="comments")
