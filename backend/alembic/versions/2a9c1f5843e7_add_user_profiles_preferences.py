"""add user_profiles.preferences

Revision ID: 2a9c1f5843e7
Revises: cca2222e50aa
Create Date: 2026-10-25 00:00:00.000000

Adds the JSON ``preferences`` column to ``user_profiles`` so the ORM model
(``app.models.user.UserProfile.preferences``) has a backing column on clean
database deployments.

HISTORY / IDEMPOTENCY
---------------------
On the original development machine the column was first introduced by this
revision, but the migration *file* was later lost while the database kept the
``alembic_version = '2a9c1f5843e7'`` stamp. This recreated file restores that
revision identity so ``alembic current`` is consistent again, and makes the
column change idempotent:

  * A brand-new (clean) database runs ``upgrade head`` and gets the column.
  * A database that already has the column (because it was added manually or by
    the original migration) is left untouched — the add is skipped.

The guard uses the live Inspector so it is safe to run against either state.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "2a9c1f5843e7"
down_revision: Union[str, None] = "cca2222e50aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "user_profiles"
COLUMN = "preferences"


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return column in {col["name"] for col in inspector.get_columns(table)}


def upgrade() -> None:
    if not _has_column(TABLE, COLUMN):
        op.add_column(TABLE, sa.Column(COLUMN, sa.JSON(), nullable=True))


def downgrade() -> None:
    if _has_column(TABLE, COLUMN):
        op.drop_column(TABLE, COLUMN)
