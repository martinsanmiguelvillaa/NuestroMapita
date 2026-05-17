"""add recommendation_history and blocked_recommendations tables

Revision ID: 010
Revises: 009
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recommendation_history",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("request_type", sa.String(10), nullable=True),
        sa.Column("request_moods", sa.JSON(), nullable=True),
        sa.Column("request_extra", sa.Text(), nullable=True),
        sa.Column("main_title", sa.String(300), nullable=False),
        sa.Column("recommendations", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recommendation_history_id", "recommendation_history", ["id"])

    op.create_table(
        "blocked_recommendations",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_blocked_recommendations_id", "blocked_recommendations", ["id"])


def downgrade() -> None:
    op.drop_index("ix_blocked_recommendations_id", table_name="blocked_recommendations")
    op.drop_table("blocked_recommendations")
    op.drop_index("ix_recommendation_history_id", table_name="recommendation_history")
    op.drop_table("recommendation_history")
