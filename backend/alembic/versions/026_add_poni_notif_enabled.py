"""Agregar poni_notif_enabled a device_subscriptions

Revision ID: 026
Revises: 025
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("device_subscriptions", sa.Column("poni_notif_enabled", sa.Boolean(), nullable=True))


def downgrade():
    op.drop_column("device_subscriptions", "poni_notif_enabled")
