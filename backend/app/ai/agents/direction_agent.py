"""Direction generation agent."""
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.base import BaseAgent
from app.ai.gemini_client import get_gemini_client
from app.ai.prompts.direction import DIRECTION_SYSTEM_PROMPT, DIRECTION_USER_PROMPT


class DirectionAgent(BaseAgent):
    """Agent for generating product directions."""

    @property
    def stage_type(self) -> str:
        return "direction"

    async def generate(
        self,
        project_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Generate product direction options based on the idea."""
        # Get idea stage data
        idea_data = await self.get_previous_stage_data(project_id, "idea", db)

        if not idea_data or not idea_data.get("input_data"):
            raise ValueError("Idea stage data not found")

        idea_content = idea_data["input_data"].get("content", "")

        # Call Gemini API
        client = get_gemini_client("pro")

        prompt = DIRECTION_USER_PROMPT.format(idea=idea_content)

        result = await client.generate_json(
            prompt=prompt,
            system_instruction=DIRECTION_SYSTEM_PROMPT,
            temperature=0.8,
        )

        # Ensure proper format
        if "directions" not in result:
            result = {"directions": result if isinstance(result, list) else [result]}

        # Add IDs if missing
        for i, direction in enumerate(result["directions"]):
            if "id" not in direction:
                direction["id"] = i + 1

        return result
