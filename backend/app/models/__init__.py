"""SQLAlchemy ORM models.

Importing this package registers every model on Base.metadata so that
Alembic autogenerate and `Base.metadata.create_all` (tests only) work.
"""
from app.database import Base

# Models are registered in later phases:
# from app.models.user import User
# from app.models.inspection import Inspection
# ...

__all__ = ["Base"]