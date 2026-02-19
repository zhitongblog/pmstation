"""Demo generation agent."""
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.base import BaseAgent
from app.ai.gemini_client import get_gemini_client
from app.ai.prompts.demo import DEMO_SYSTEM_PROMPT, DEMO_USER_PROMPT


class DemoAgent(BaseAgent):
    """Agent for generating interactive demo code."""

    @property
    def stage_type(self) -> str:
        return "demo"

    async def generate(
        self,
        project_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Generate React code for interactive demo."""
        # Get previous stage data
        idea_data = await self.get_previous_stage_data(project_id, "idea", db)
        direction_data = await self.get_previous_stage_data(project_id, "direction", db)
        features_data = await self.get_previous_stage_data(project_id, "features", db)
        platform_data = await self.get_previous_stage_data(project_id, "platform", db)

        if not features_data:
            raise ValueError("Features stage data not found")

        idea_content = idea_data["input_data"].get("content", "") if idea_data else ""
        selected_direction = direction_data.get("selected_option", {}) if direction_data else {}

        # Get selected features
        output_data = features_data.get("output_data") or {}
        modules = output_data.get("modules") or []
        selected_option = features_data.get("selected_option") or {}
        selected_ids = selected_option.get("selected_ids") or []

        # Filter to selected modules if any
        if selected_ids:
            modules = self._filter_selected_modules(modules, selected_ids)

        # Get platform info for responsive design hints
        platform_info = ""
        if platform_data:
            platforms = platform_data.get("output_data", {}).get("platforms", [])
            if platforms:
                platform_info = f"目标平台: {', '.join(platforms)}"

        # Call Gemini API
        client = get_gemini_client("pro")

        prompt = DEMO_USER_PROMPT.format(
            idea=idea_content,
            direction=selected_direction.get("title", ""),
            features=self._format_features(modules),
            platform_info=platform_info,
        )

        result = await client.generate_json(
            prompt=prompt,
            system_instruction=DEMO_SYSTEM_PROMPT,
            temperature=0.6,
            max_output_tokens=16384,  # Larger for code generation
        )

        return result

    def _filter_selected_modules(self, modules: list, selected_ids: list) -> list:
        """Filter modules by selected IDs."""
        result = []
        for module in modules:
            if module.get("id") in selected_ids:
                result.append(module)
            elif "sub_features" in module:
                sub = self._filter_selected_modules(module["sub_features"], selected_ids)
                if sub:
                    module_copy = module.copy()
                    module_copy["sub_features"] = sub
                    result.append(module_copy)
        return result

    def _format_features(self, modules: list, indent: int = 0) -> str:
        """Format features/modules as text for prompt."""
        lines = []
        for module in modules:
            prefix = "  " * indent
            lines.append(f"{prefix}## {module.get('name', 'Module')}")
            lines.append(f"{prefix}Description: {module.get('description', '')}")
            if "sub_features" in module and module["sub_features"]:
                lines.append(f"{prefix}Sub-features:")
                for sub in module["sub_features"]:
                    lines.append(f"{prefix}  - {sub.get('name', '')}: {sub.get('description', '')}")
            lines.append("")
        return "\n".join(lines)
