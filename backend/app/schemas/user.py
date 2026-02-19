"""User schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    name: str
    avatar_url: str | None = None


class UserCreate(UserBase):
    """Schema for creating a user."""
    google_id: str


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    name: str | None = None
    avatar_url: str | None = None


class UserRead(UserBase):
    """Schema for reading a user."""
    id: UUID
    google_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GoogleUserInfo(BaseModel):
    """Schema for Google user info from OAuth."""
    id: str
    email: EmailStr
    name: str
    picture: str | None = None
