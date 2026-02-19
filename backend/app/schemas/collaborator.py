"""Collaborator schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class CollaboratorBase(BaseModel):
    """Base collaborator schema."""
    role: str = "viewer"


class CollaboratorCreate(BaseModel):
    """Schema for inviting a collaborator."""
    email: EmailStr


class CollaboratorRead(CollaboratorBase):
    """Schema for reading a collaborator."""
    id: UUID
    project_id: UUID
    user_id: UUID
    invited_at: datetime
    accepted_at: datetime | None = None

    class Config:
        from_attributes = True


class CollaboratorWithUser(CollaboratorRead):
    """Schema for reading a collaborator with user info."""
    user_name: str
    user_email: str
    user_avatar: str | None = None
