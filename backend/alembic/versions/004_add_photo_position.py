"""add position_x and position_y to photos

Revision ID: 004
Revises: 003
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('photos', sa.Column('position_x', sa.Integer(), nullable=False, server_default='50'))
    op.add_column('photos', sa.Column('position_y', sa.Integer(), nullable=False, server_default='50'))


def downgrade():
    op.drop_column('photos', 'position_y')
    op.drop_column('photos', 'position_x')
