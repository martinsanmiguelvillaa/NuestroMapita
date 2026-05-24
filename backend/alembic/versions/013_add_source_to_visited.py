"""add source column to places_visited

Revision ID: 013
Revises: 012
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "places_visited",
        sa.Column("source", sa.String(20), nullable=True),
    )


def downgrade():
    op.drop_column("places_visited", "source")
