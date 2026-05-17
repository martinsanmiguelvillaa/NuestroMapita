"""add cine_items and cine_comments tables

Revision ID: 009
Revises: 008
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cine_items",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column(
            "status",
            sa.String(10),
            nullable=False,
            server_default="to_watch",
        ),
        sa.Column("poster_url", sa.String(500), nullable=True),
        sa.Column("synopsis", sa.Text(), nullable=True),
        sa.Column("genres", sa.JSON(), nullable=True),
        sa.Column("platform", sa.String(200), nullable=True),
        sa.Column("trailer_url", sa.String(500), nullable=True),
        sa.Column("year", sa.String(10), nullable=True),
        sa.Column("rating", sa.SmallInteger(), nullable=True),
        sa.Column(
            "is_favorite",
            sa.Boolean(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("external_source", sa.String(20), nullable=True),
        sa.Column("external_id", sa.String(50), nullable=True),
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
    op.create_index("ix_cine_items_id", "cine_items", ["id"])

    op.create_table(
        "cine_comments",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("cine_item_id", sa.Integer(), nullable=False),
        sa.Column("author", sa.String(100), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["cine_item_id"],
            ["cine_items.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cine_comments_id", "cine_comments", ["id"])


def downgrade() -> None:
    op.drop_index("ix_cine_comments_id", table_name="cine_comments")
    op.drop_table("cine_comments")
    op.drop_index("ix_cine_items_id", table_name="cine_items")
    op.drop_table("cine_items")
