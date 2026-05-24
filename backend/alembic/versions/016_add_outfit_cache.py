"""add outfit_cache table

Revision ID: 016
Revises: 015
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "outfit_cache",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_key", sa.String(20), nullable=False, unique=True),
        sa.Column("outfit_data", sa.Text(), nullable=False),
        sa.Column("weather_data", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
    )


def downgrade():
    op.drop_table("outfit_cache")
