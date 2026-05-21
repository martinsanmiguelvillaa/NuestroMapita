"""add places_trips table and place_trip_id to photos

Revision ID: 012
Revises: 011
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "places_trips",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("address", sa.String(400), nullable=True),
        sa.Column("google_maps_url", sa.String(500), nullable=True),
        sa.Column("social_url", sa.String(500), nullable=True),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    op.add_column(
        "photos",
        sa.Column("place_trip_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_photos_place_trip",
        "photos", "places_trips",
        ["place_trip_id"], ["id"],
        ondelete="CASCADE",
    )


def downgrade():
    op.drop_constraint("fk_photos_place_trip", "photos", type_="foreignkey")
    op.drop_column("photos", "place_trip_id")
    op.drop_table("places_trips")
