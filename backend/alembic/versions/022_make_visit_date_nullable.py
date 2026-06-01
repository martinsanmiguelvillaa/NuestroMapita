"""make visit_date nullable in places_visited

Revision ID: 022
Revises: 021
Create Date: 2026-05-31
"""
from alembic import op
import sqlalchemy as sa

revision = '022'
down_revision = '021'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        'places_visited',
        'visit_date',
        existing_type=sa.Date(),
        nullable=True,
    )


def downgrade():
    op.alter_column(
        'places_visited',
        'visit_date',
        existing_type=sa.Date(),
        nullable=False,
    )
