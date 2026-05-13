"""Esquema inicial: places_visited, photos, places_wishlist, letters

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f6"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Tabla: places_visited ---
    op.create_table(
        "places_visited",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(400), nullable=False),
        sa.Column("visit_date", sa.Date(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("rating", sa.SmallInteger(), nullable=True),
        sa.Column("google_maps_url", sa.String(500), nullable=True),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_places_visited_id", "places_visited", ["id"])

    # --- Tabla: photos ---
    op.create_table(
        "photos",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("place_visited_id", sa.Integer(), nullable=False),
        sa.Column("cloudinary_url", sa.String(500), nullable=False),
        sa.Column("cloudinary_public_id", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["place_visited_id"], ["places_visited.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_photos_id", "photos", ["id"])

    # --- Tabla: places_wishlist ---
    op.create_table(
        "places_wishlist",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("address", sa.String(400), nullable=False),
        sa.Column("google_maps_url", sa.String(500), nullable=True),
        sa.Column("social_url", sa.String(500), nullable=True),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_places_wishlist_id", "places_wishlist", ["id"])

    # --- Tabla: letters ---
    op.create_table(
        "letters",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("letter_date", sa.Date(), nullable=True),
        sa.Column("photo_url", sa.String(500), nullable=True),
        sa.Column("photo_public_id", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_letters_id", "letters", ["id"])


def downgrade() -> None:
    op.drop_table("letters")
    op.drop_table("places_wishlist")
    op.drop_table("photos")
    op.drop_table("places_visited")
