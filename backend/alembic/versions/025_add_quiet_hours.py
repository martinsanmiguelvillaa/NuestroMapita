"""Agregar quiet_start/quiet_end (horas de silencio) a device_subscriptions

Revision ID: 025
Revises: 024
Create Date: 2026-06-12
"""
from alembic import op
import sqlalchemy as sa

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("device_subscriptions", sa.Column("quiet_start", sa.String(5), nullable=True))
    op.add_column("device_subscriptions", sa.Column("quiet_end", sa.String(5), nullable=True))


def downgrade():
    op.drop_column("device_subscriptions", "quiet_end")
    op.drop_column("device_subscriptions", "quiet_start")
