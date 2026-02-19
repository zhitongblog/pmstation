"""Feature generation agent."""
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.base import BaseAgent
from app.ai.gemini_client import get_gemini_client
from app.ai.prompts.features import FEATURE_SYSTEM_PROMPT, FEATURE_USER_PROMPT


class FeatureAgent(BaseAgent):
    """Agent for generating feature modules."""

    @property
    def stage_type(self) -> str:
        return "features"

    async def generate(
        self,
        project_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Generate feature modules based on selected direction and platform."""
        # Get idea, direction, and platform data
        idea_data = await self.get_previous_stage_data(project_id, "idea", db)
        direction_data = await self.get_previous_stage_data(project_id, "direction", db)
        platform_data = await self.get_previous_stage_data(project_id, "platform", db)

        if not idea_data or not idea_data.get("input_data"):
            raise ValueError("Idea stage data not found")

        if not direction_data or not direction_data.get("selected_option"):
            raise ValueError("Direction not selected")

        if not platform_data or not platform_data.get("selected_option"):
            raise ValueError("Platform not selected")

        idea_content = idea_data["input_data"].get("content", "")
        selected_direction = direction_data["selected_option"]
        platform_selection = platform_data["selected_option"]

        # Extract platform info
        platforms = platform_selection.get("platforms", ["pc", "mobile"])
        pc_type = platform_selection.get("pc_type", "full") if "pc" in platforms else "N/A"
        mobile_type = platform_selection.get("mobile_type", "user") if "mobile" in platforms else "N/A"

        # Call Gemini API
        client = get_gemini_client("pro")

        prompt = FEATURE_USER_PROMPT.format(
            idea=idea_content,
            direction_title=selected_direction.get("title", ""),
            direction_positioning=selected_direction.get("positioning", ""),
            target_users=selected_direction.get("target_users", ""),
            value_proposition=selected_direction.get("value_proposition", ""),
            platforms=", ".join(platforms),
            pc_type=pc_type,
            mobile_type=mobile_type,
        )

        result = await client.generate_json(
            prompt=prompt,
            system_instruction=FEATURE_SYSTEM_PROMPT,
            temperature=0.7,
        )

        # Ensure proper format
        if "modules" not in result:
            result = {"modules": result if isinstance(result, list) else [result]}

        # Add IDs and default selected state if missing
        self._add_ids_recursive(result["modules"])

        return result

    def _add_ids_recursive(self, modules: list, counter: list | None = None) -> None:
        """Add IDs to modules recursively."""
        if counter is None:
            counter = [1]

        for module in modules:
            if "id" not in module:
                module["id"] = counter[0]
                counter[0] += 1
            if "selected" not in module:
                module["selected"] = True
            if "sub_features" in module and module["sub_features"]:
                self._add_ids_recursive(module["sub_features"], counter)
