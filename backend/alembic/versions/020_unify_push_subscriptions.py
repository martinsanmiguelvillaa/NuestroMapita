"""Unificar suscripciones push en device_subscriptions

Revision ID: 020
Revises: 019
Create Date: 2026-05-31
"""
from alembic import op
import sqlalchemy as sa

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "device_subscriptions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("device_id", sa.String(100), nullable=False),
        sa.Column("user_key", sa.String(20), nullable=False),
        sa.Column("endpoint", sa.String(500), nullable=False),
        sa.Column("p256dh", sa.String(200), nullable=False),
        sa.Column("auth", sa.String(100), nullable=False),
        sa.Column("device_label", sa.String(100), nullable=True),
        sa.Column("timezone", sa.String(60), nullable=False, server_default="America/Argentina/Buenos_Aires"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("outfit_notif_enabled", sa.Boolean(), nullable=True),
        sa.Column("outfit_notif_time", sa.String(5), nullable=True),
        sa.Column("outfit_last_sent_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("device_id", "user_key", name="uq_device_subscription_device_user"),
    )

    # Migrar outfit_notification_subscriptions → device_subscriptions
    # outfit.enabled controla tanto el master como el flag de outfit
    op.execute("""
        INSERT INTO device_subscriptions
            (device_id, user_key, endpoint, p256dh, auth, device_label, timezone,
             enabled, outfit_notif_enabled, outfit_notif_time, outfit_last_sent_at,
             created_at, updated_at)
        SELECT
            device_id, user_key, endpoint, p256dh, auth, device_label, timezone,
            enabled, enabled, notification_time, last_sent_at,
            created_at, updated_at
        FROM outfit_notification_subscriptions
        ON DUPLICATE KEY UPDATE
            endpoint            = VALUES(endpoint),
            p256dh              = VALUES(p256dh),
            auth                = VALUES(auth),
            device_label        = VALUES(device_label),
            timezone            = VALUES(timezone),
            enabled             = VALUES(enabled),
            outfit_notif_enabled = VALUES(outfit_notif_enabled),
            outfit_notif_time   = VALUES(outfit_notif_time),
            outfit_last_sent_at = VALUES(outfit_last_sent_at),
            updated_at          = VALUES(updated_at)
    """)

    # Migrar push_subscriptions → device_subscriptions (suscripciones genéricas)
    # Usar UUID() como device_id ya que no tenemos uno; user_key="ambos"
    op.execute("""
        INSERT INTO device_subscriptions
            (device_id, user_key, endpoint, p256dh, auth, enabled, created_at, updated_at)
        SELECT
            UUID(), 'ambos', endpoint, p256dh, auth, 1, created_at, created_at
        FROM push_subscriptions ps
        WHERE NOT EXISTS (
            SELECT 1 FROM device_subscriptions ds WHERE ds.endpoint = ps.endpoint
        )
    """)


def downgrade():
    op.drop_table("device_subscriptions")
