"""add place_wishlist_id to photos and make place_visited_id nullable

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade():
    # place_visited_id ahora puede ser NULL (cuando la foto es de un wishlist)
    op.alter_column(
        "photos", "place_visited_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    # Nueva FK a places_wishlist
    op.add_column(
        "photos",
        sa.Column("place_wishlist_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_photos_place_wishlist",
        "photos", "places_wishlist",
        ["place_wishlist_id"], ["id"],
        ondelete="CASCADE",
    )


def downgrade():
    op.drop_constraint("fk_photos_place_wishlist", "photos", type_="foreignkey")
    op.drop_column("photos", "place_wishlist_id")
    op.alter_column(
        "photos", "place_visited_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
