"""add would_revisit to places_visited

Revision ID: 007
Revises: 006
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('places_visited', sa.Column(
        'would_revisit',
        sa.Boolean(),
        nullable=True,
        server_default=None,
    ))


def downgrade():
    op.drop_column('places_visited', 'would_revisit')
