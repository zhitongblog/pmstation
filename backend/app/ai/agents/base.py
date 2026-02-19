"""Base agent class."""
from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession


async def get_stage_data(
    project_id: UUID,
    stage_type: str,
    db: AsyncSession,
) -> dict[str, Any] | None:
    """Get data from a stage (standalone utility function)."""
    from sqlalchemy import select
    from app.models.stage import Stage

    result = await db.execute(
        select(Stage)
        .where(Stage.project_id == project_id)
        .where(Stage.type == stage_type)
        .order_by(Stage.version.desc())
    )
    stage = result.scalars().first()

    if stage:
        return {
            "input_data": stage.input_data,
            "output_data": stage.output_data,
            "selected_option": stage.selected_option,
        }
    return None


class BaseAgent(ABC):
    """Base class for AI agents."""

    @property
    @abstractmethod
    def stage_type(self) -> str:
        """Return the stage type this agent handles."""
        pass

    @abstractmethod
    async def generate(
        self,
        project_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """
        Generate output for this stage.

        Args:
            project_id: The project ID
            db: Database session

        Returns:
            Output data dictionary
        """
        pass

    async def get_previous_stage_data(
        self,
        project_id: UUID,
        stage_type: str,
        db: AsyncSession,
    ) -> dict[str, Any] | None:
        """Get data from a previous stage."""
        from sqlalchemy import select
        from app.models.stage import Stage

        result = await db.execute(
            select(Stage)
            .where(Stage.project_id == project_id)
            .where(Stage.type == stage_type)
            .order_by(Stage.version.desc())
        )
        stage = result.scalars().first()

        if stage:
            return {
                "input_data": stage.input_data,
                "output_data": stage.output_data,
                "selected_option": stage.selected_option,
            }
        return None
