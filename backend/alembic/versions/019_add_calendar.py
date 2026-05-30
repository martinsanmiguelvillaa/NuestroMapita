"""add calendar tables (event_types, calendar_events)

Revision ID: 019
Revises: 018
Create Date: 2026-05-28
"""
import sqlalchemy as sa
from alembic import op

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "event_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(20), nullable=False, server_default="#CFC4B8"),
        sa.Column("created_by", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "calendar_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("start_time", sa.String(5), nullable=True),
        sa.Column("end_time", sa.String(5), nullable=True),
        sa.Column("all_day", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "type_id",
            sa.Integer(),
            sa.ForeignKey("event_types.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("participants", sa.String(20), nullable=False, server_default="ambos"),
        sa.Column("created_by", sa.String(20), nullable=False),
        sa.Column("notif_enabled", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("notif_minutes", sa.Integer(), nullable=True),
        sa.Column("recurrence", sa.Text(), nullable=True),
        sa.Column("series_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("calendar_events")
    op.drop_table("event_types")
