"""Note schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class NoteBase(BaseModel):
    """Base note schema."""
    content: str = Field(..., min_length=1)


class NoteCreate(NoteBase):
    """Schema for creating a note."""
    pass


class NoteUpdate(BaseModel):
    """Schema for updating a note."""
    content: str = Field(..., min_length=1)


class NoteRead(NoteBase):
    """Schema for reading a note."""
    id: UUID
    stage_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NoteWithUser(NoteRead):
    """Schema for reading a note with user info."""
    user_name: str
    user_avatar: str | None = None
