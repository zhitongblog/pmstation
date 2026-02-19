"""Database models."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


from app.models.user import User
from app.models.project import Project
from app.models.stage import Stage
from app.models.collaborator import Collaborator
from app.models.note import Note
from app.models.generated_file import GeneratedFile

__all__ = [
    "Base",
    "User",
    "Project",
    "Stage",
    "Collaborator",
    "Note",
    "GeneratedFile",
]
