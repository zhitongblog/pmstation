"""Stage schemas."""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class StageBase(BaseModel):
    """Base stage schema."""
    type: str
    status: str


class StageRead(StageBase):
    """Schema for reading a stage."""
    id: UUID
    project_id: UUID
    input_data: dict[str, Any] | None = None
    output_data: dict[str, Any] | None = None
    selected_option: dict[str, Any] | None = None
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StageGenerate(BaseModel):
    """Schema for triggering AI generation."""
    # No input needed - uses previous stage data
    pass


class StageSelect(BaseModel):
    """Schema for selecting an option (e.g., direction selection)."""
    selected_id: int


class StageConfirm(BaseModel):
    """Schema for confirming a stage."""
    # Can include additional confirmation data if needed
    pass


class SelectionInput(BaseModel):
    """Unified schema for selecting options in any stage."""
    selected_id: int | None = None  # For direction selection
    selected_ids: list[int] | None = None  # For feature selection


class DirectionOption(BaseModel):
    """Schema for a product direction option."""
    id: int
    title: str
    positioning: str
    target_users: str
    value_proposition: str
    market_opportunity: str | None = None
    competitors: list[str] = []
    success_factors: list[str] = []
    risks: list[str] = []


class DirectionOutput(BaseModel):
    """Schema for direction generation output."""
    directions: list[DirectionOption]


class FeatureModule(BaseModel):
    """Schema for a feature module."""
    id: int
    name: str
    description: str
    priority: str  # P0, P1, P2, P3
    sub_features: list["FeatureModule"] = []
    selected: bool = True


class FeatureOutput(BaseModel):
    """Schema for feature generation output."""
    modules: list[FeatureModule]


class FeatureSelect(BaseModel):
    """Schema for selecting features."""
    selected_ids: list[int]


class PlatformSelection(BaseModel):
    """Schema for platform selection."""
    platforms: list[str]  # ["pc", "mobile"]
    pc_type: str | None = None  # "full" | "admin"
    mobile_type: str | None = None  # "user" | "full"
