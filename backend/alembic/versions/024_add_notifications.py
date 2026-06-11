"""Agregar tabla notifications (historial in-app / campanita)

Revision ID: 024
Revises: 023
Create Date: 2026-06-11
"""
from alembic import op
import sqlalchemy as sa

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_key", sa.String(10), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("url", sa.String(300), nullable=True),
        sa.Column("source_type", sa.String(30), nullable=True),
        sa.Column("source_id", sa.Integer(), nullable=True),
        sa.Column("dedupe_key", sa.String(120), nullable=True),
        sa.Column("priority", sa.String(10), server_default="normal", nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedupe_key"),
    )
    op.create_index("ix_notifications_id", "notifications", ["id"])
    op.create_index("ix_notifications_user_read", "notifications", ["user_key", "read_at"])
    op.create_index("ix_notifications_source", "notifications", ["source_type", "source_id"])


def downgrade():
    op.drop_table("notifications")
