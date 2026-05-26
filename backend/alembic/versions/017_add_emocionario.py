"""add emotional_entries table

Revision ID: 017
Revises: 016
Create Date: 2026-05-25
"""
from alembic import op
import sqlalchemy as sa

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "emotional_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_key", sa.String(20), nullable=False),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("emotion_key", sa.String(50), nullable=False),
        sa.Column("intensity", sa.SmallInteger(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_key", "date", name="uq_emotional_user_date"),
    )


def downgrade():
    op.drop_table("emotional_entries")
