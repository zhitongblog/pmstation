"""Project schemas."""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    """Base project schema."""
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""
    idea: str = Field(..., min_length=1, description="Initial product idea")


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = Field(None, pattern="^(active|archived|deleted)$")


class ProjectRead(ProjectBase):
    """Schema for reading a project."""
    id: UUID
    owner_id: UUID
    status: str
    current_stage: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StageInfo(BaseModel):
    """Brief stage info for project response."""
    id: UUID
    type: str
    status: str
    version: int

    class Config:
        from_attributes = True


class ProjectWithStages(ProjectRead):
    """Schema for reading a project with stages."""
    stages: list[StageInfo] = []
