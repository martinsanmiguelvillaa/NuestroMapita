"""add outfit_notification_subscriptions table

Revision ID: 015
Revises: 014
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "outfit_notification_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_key", sa.String(20), nullable=False),
        sa.Column("device_id", sa.String(100), nullable=False),
        sa.Column("endpoint", sa.String(500), nullable=False),
        sa.Column("p256dh", sa.String(200), nullable=False),
        sa.Column("auth", sa.String(100), nullable=False),
        sa.Column("notification_time", sa.String(5), nullable=False, server_default="09:00"),
        sa.Column("timezone", sa.String(60), nullable=False, server_default="America/Argentina/Buenos_Aires"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("device_label", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column("last_sent_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("user_key", "device_id", name="uq_outfit_notif_user_device"),
    )


def downgrade():
    op.drop_table("outfit_notification_subscriptions")
