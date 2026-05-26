"""allow multiple emotions per user per day

Revision ID: 018
Revises: 017
Create Date: 2026-05-26
"""
from alembic import op

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("uq_emotional_user_date", "emotional_entries", type_="unique")
    op.create_unique_constraint(
        "uq_emotional_user_date_emotion",
        "emotional_entries",
        ["user_key", "date", "emotion_key"],
    )


def downgrade():
    op.drop_constraint("uq_emotional_user_date_emotion", "emotional_entries", type_="unique")
    op.create_unique_constraint(
        "uq_emotional_user_date",
        "emotional_entries",
        ["user_key", "date"],
    )
