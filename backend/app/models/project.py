"""Project model."""
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.stage import Stage
    from app.models.collaborator import Collaborator


class Project(Base):
    """Project model for storing product projects."""

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        nullable=False,
    )  # active, archived, deleted
    current_stage: Mapped[str] = mapped_column(
        String(50),
        default="idea",
        nullable=False,
    )  # idea, direction, features, prototype, demo, prd, testcases
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_projects")
    stages: Mapped[list["Stage"]] = relationship(
        "Stage",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    collaborators: Mapped[list["Collaborator"]] = relationship(
        "Collaborator",
        back_populates="project",
        cascade="all, delete-orphan",
    )
