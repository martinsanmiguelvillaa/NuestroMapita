"""add names and name_ratings tables

Revision ID: 014
Revises: 013
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "names",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("text", sa.String(100), nullable=False),
        sa.Column("text_normalized", sa.String(100), nullable=False, unique=True),
        sa.Column("gender", sa.String(20), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "name_ratings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name_id", sa.Integer(), nullable=False),
        sa.Column("person", sa.String(20), nullable=False),
        sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["name_id"], ["names.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("name_id", "person", name="uq_name_rating_person"),
    )


def downgrade():
    op.drop_table("name_ratings")
    op.drop_table("names")
