"""PRD generation agent."""
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.base import BaseAgent
from app.ai.gemini_client import get_gemini_client
from app.ai.prompts.prd import PRD_SYSTEM_PROMPT, PRD_USER_PROMPT


class PRDAgent(BaseAgent):
    """Agent for generating PRD documents."""

    @property
    def stage_type(self) -> str:
        return "prd"

    async def generate(
        self,
        project_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Generate PRD documents for each module."""
        # Get all previous stage data
        idea_data = await self.get_previous_stage_data(project_id, "idea", db)
        direction_data = await self.get_previous_stage_data(project_id, "direction", db)
        features_data = await self.get_previous_stage_data(project_id, "features", db)
        prototype_data = await self.get_previous_stage_data(project_id, "prototype", db)
        demo_data = await self.get_previous_stage_data(project_id, "demo", db)

        idea_content = idea_data["input_data"].get("content", "") if idea_data else ""
        selected_direction = direction_data.get("selected_option", {}) if direction_data else {}
        modules = features_data.get("output_data", {}).get("modules", []) if features_data else []
        screens = prototype_data.get("output_data", {}).get("screens", []) if prototype_data else []

        # Call Gemini API
        client = get_gemini_client("pro")

        prompt = PRD_USER_PROMPT.format(
            idea=idea_content,
            direction_title=selected_direction.get("title", ""),
            direction_positioning=selected_direction.get("positioning", ""),
            target_users=selected_direction.get("target_users", ""),
            value_proposition=selected_direction.get("value_proposition", ""),
            modules=self._format_modules(modules),
            screens=self._format_screens(screens),
        )

        result = await client.generate_json(
            prompt=prompt,
            system_instruction=PRD_SYSTEM_PROMPT,
            temperature=0.6,
            max_output_tokens=32768,  # Large for comprehensive PRD
        )

        return result

    def _format_modules(self, modules: list, indent: int = 0) -> str:
        """Format modules as text for prompt."""
        lines = []
        for module in modules:
            prefix = "  " * indent
            priority = module.get("priority", "P2")
            lines.append(f"{prefix}- [{priority}] {module.get('name', 'Unknown')}: {module.get('description', '')}")
            if "sub_features" in module and module["sub_features"]:
                lines.append(self._format_modules(module["sub_features"], indent + 1))
        return "\n".join(lines)

    def _format_screens(self, screens: list) -> str:
        """Format screens as text for prompt."""
        lines = []
        for screen in screens:
            lines.append(f"- {screen.get('name', 'Screen')}: {screen.get('description', '')}")
        return "\n".join(lines)
