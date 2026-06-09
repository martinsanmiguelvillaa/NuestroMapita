"""make ingredients and steps nullable in recipes

Revision ID: 023
Revises: 022
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa

revision = '023'
down_revision = '022'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        'recipes',
        'ingredients',
        existing_type=sa.Text(),
        nullable=True,
    )
    op.alter_column(
        'recipes',
        'steps',
        existing_type=sa.Text(),
        nullable=True,
    )


def downgrade():
    op.alter_column(
        'recipes',
        'ingredients',
        existing_type=sa.Text(),
        nullable=False,
    )
    op.alter_column(
        'recipes',
        'steps',
        existing_type=sa.Text(),
        nullable=False,
    )
