"""Agregar calendar_notif_enabled a device_subscriptions

Revision ID: 021
Revises: 020
Create Date: 2026-05-31
"""
from alembic import op
import sqlalchemy as sa

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "device_subscriptions",
        sa.Column("calendar_notif_enabled", sa.Boolean(), nullable=True),
    )


def downgrade():
    op.drop_column("device_subscriptions", "calendar_notif_enabled")
