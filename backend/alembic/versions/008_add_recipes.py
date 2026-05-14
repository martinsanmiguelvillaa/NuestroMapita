"""add recipes and recipe_comments tables

Revision ID: 008
Revises: 007
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("category", sa.String(10), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("image_public_id", sa.String(200), nullable=True),
        sa.Column("ingredients", sa.Text(), nullable=False),
        sa.Column("steps", sa.Text(), nullable=False),
        sa.Column("video_url", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recipes_id", "recipes", ["id"])

    op.create_table(
        "recipe_comments",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("author", sa.String(100), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["recipe_id"],
            ["recipes.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recipe_comments_id", "recipe_comments", ["id"])


def downgrade() -> None:
    op.drop_index("ix_recipe_comments_id", table_name="recipe_comments")
    op.drop_table("recipe_comments")
    op.drop_index("ix_recipes_id", table_name="recipes")
    op.drop_table("recipes")
