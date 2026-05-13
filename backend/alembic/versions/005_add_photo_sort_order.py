"""add sort_order to photos for cover photo selection

Revision ID: 005
Revises: 004
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('photos', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('photos', 'sort_order')
