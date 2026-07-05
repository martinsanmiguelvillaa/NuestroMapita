"""Agregar image_position_x e image_position_y a recipes

Revision ID: 027
Revises: 026
Create Date: 2026-07-04
"""
from alembic import op
import sqlalchemy as sa

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("recipes", sa.Column("image_position_x", sa.Integer(), nullable=False, server_default="50"))
    op.add_column("recipes", sa.Column("image_position_y", sa.Integer(), nullable=False, server_default="50"))


def downgrade():
    op.drop_column("recipes", "image_position_y")
    op.drop_column("recipes", "image_position_x")
