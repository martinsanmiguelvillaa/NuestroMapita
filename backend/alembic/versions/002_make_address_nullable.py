"""make address nullable in places_visited and places_wishlist

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "places_visited", "address",
        existing_type=sa.String(400),
        nullable=True,
    )
    op.alter_column(
        "places_wishlist", "address",
        existing_type=sa.String(400),
        nullable=True,
    )


def downgrade():
    # May fail if there are NULL values already stored
    op.alter_column(
        "places_visited", "address",
        existing_type=sa.String(400),
        nullable=False,
    )
    op.alter_column(
        "places_wishlist", "address",
        existing_type=sa.String(400),
        nullable=False,
    )
