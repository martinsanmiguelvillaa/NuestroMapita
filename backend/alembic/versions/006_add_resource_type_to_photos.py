"""add resource_type to photos

Revision ID: 006
Revises: 005
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('photos', sa.Column(
        'resource_type',
        sa.String(10),
        nullable=False,
        server_default='image',
    ))


def downgrade():
    op.drop_column('photos', 'resource_type')
