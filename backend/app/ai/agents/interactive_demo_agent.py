"""Interactive demo generation agent with streaming support."""
from typing import Any, AsyncGenerator
from uuid import UUID
import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.base import BaseAgent
from app.ai.gemini_client import get_gemini_client
from app.ai.prompts.demo import (
    DEMO_STRUCTURE_SYSTEM_PROMPT,
    DEMO_STRUCTURE_USER_PROMPT,
    DEMO_PAGE_SYSTEM_PROMPT,
    DEMO_PAGE_USER_PROMPT,
    DEMO_MODIFY_SYSTEM_PROMPT,
    DEMO_MODIFY_USER_PROMPT,
)


class InteractiveDemoAgent(BaseAgent):
    """Agent for generating interactive demo with streaming support."""

    @property
    def stage_type(self) -> str:
        return "demo"

    async def generate(
        self,
        project_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """
        Generate complete demo with structure and code.
        This is the synchronous interface for workflow compatibility.
        """
        # Phase 1: Generate structure
        result = await self.generate_structure(project_id, db)

        # Phase 2: Generate code for each page
        context = await self._get_project_context(project_id, db)

        for platform in result.get("platforms", []):
            platform_type = platform.get("type", "pc")
            for page in platform.get("pages", []):
                # Generate code for this page
                code_chunks = []
                page_context = {**context, "platform_type": platform_type}

                async for chunk in self.generate_page_stream(page, page_context):
                    code_chunks.append(chunk)

                page["code"] = "".join(code_chunks)
                page["status"] = "completed"

        return result

    async def generate_structure(
        self,
        project_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """
        Phase 1: Generate demo structure quickly.
        Uses flash model for speed.
        """
        context = await self._get_project_context(project_id, db)

        client = get_gemini_client("flash")

        prompt = DEMO_STRUCTURE_USER_PROMPT.format(
            idea=context["idea"],
            direction=context["direction"],
            features=context["features_text"],
            platform_info=context["platform_info"],
        )

        # Try generate_json first, fall back to text generation
        try:
            result = await client.generate_json(
                prompt=prompt,
                system_instruction=DEMO_STRUCTURE_SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=4096,
            )
        except Exception as e:
            # Fallback: generate text and parse manually
            import logging
            logging.getLogger(__name__).warning(f"generate_json failed: {e}, falling back to text")

            text = await client.generate_text(
                prompt=prompt,
                system_instruction=DEMO_STRUCTURE_SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=4096,
            )

            # Extract JSON from text
            text = text.strip()
            if text.startswith("```"):
                # Remove markdown code fences
                lines = text.split("\n")
                text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

            # Find JSON object
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                result = json.loads(text[start:end])
            else:
                raise ValueError(f"No JSON found in response: {text[:200]}")

        # Add pending status to all pages
        for platform in result.get("platforms", []):
            for page in platform.get("pages", []):
                page["status"] = "pending"
                page["code"] = ""

        return result

    async def generate_page_stream(
        self,
        page: dict[str, Any],
        context: dict[str, Any],
    ) -> AsyncGenerator[str, None]:
        """
        Phase 2: Generate code for a single page with streaming.
        Uses pro model for quality.
        """
        client = get_gemini_client("pro")

        # Format transitions for prompt
        transitions_text = ""
        if page.get("transitions"):
            transitions_text = "页面跳转:\n"
            for t in page["transitions"]:
                transitions_text += f"- {t.get('trigger', 'action')} → {t.get('target_page_id', '')}\n"
        else:
            transitions_text = "无页面跳转"

        prompt = DEMO_PAGE_USER_PROMPT.format(
            page_name=page.get("name", ""),
            page_path=page.get("path", ""),
            page_description=page.get("description", ""),
            transitions=transitions_text,
            idea=context.get("idea", ""),
            direction=context.get("direction", ""),
            platform_type=context.get("platform_type", "pc"),
            related_features=context.get("features_text", ""),
            shared_state=json.dumps(context.get("shared_state", {}), ensure_ascii=False),
        )

        async for chunk in client.generate_text_stream(
            prompt=prompt,
            system_instruction=DEMO_PAGE_SYSTEM_PROMPT,
            temperature=0.6,
            max_output_tokens=8192,
        ):
            yield chunk

    async def modify_page_stream(
        self,
        instruction: str,
        current_code: str,
        page_info: dict[str, Any],
    ) -> AsyncGenerator[str, None]:
        """
        Modify a page based on user instruction with streaming.
        """
        client = get_gemini_client("pro")

        prompt = DEMO_MODIFY_USER_PROMPT.format(
            instruction=instruction,
            current_code=current_code,
            page_name=page_info.get("name", ""),
            page_description=page_info.get("description", ""),
        )

        async for chunk in client.generate_text_stream(
            prompt=prompt,
            system_instruction=DEMO_MODIFY_SYSTEM_PROMPT,
            temperature=0.6,
            max_output_tokens=8192,
        ):
            yield chunk

    async def _get_project_context(
        self,
        project_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Get all relevant project context for generation."""
        idea_data = await self.get_previous_stage_data(project_id, "idea", db)
        direction_data = await self.get_previous_stage_data(project_id, "direction", db)
        features_data = await self.get_previous_stage_data(project_id, "features", db)
        platform_data = await self.get_previous_stage_data(project_id, "platform", db)

        idea_content = ""
        if idea_data:
            idea_content = idea_data["input_data"].get("content", "")

        selected_direction = {}
        if direction_data:
            selected_direction = direction_data.get("selected_option", {})

        # Get selected features
        modules = []
        if features_data:
            output_data = features_data.get("output_data") or {}
            modules = output_data.get("modules") or []
            selected_option = features_data.get("selected_option") or {}
            selected_ids = selected_option.get("selected_ids") or []
            if selected_ids:
                modules = self._filter_selected_modules(modules, selected_ids)

        # Get platform info
        platform_info = ""
        platforms = []
        if platform_data:
            output_data = platform_data.get("output_data", {})
            platforms = output_data.get("platforms", [])
            if platforms:
                platform_info = f"目标平台: {', '.join(platforms)}"

        return {
            "idea": idea_content,
            "direction": selected_direction.get("title", ""),
            "features_text": self._format_features(modules),
            "platform_info": platform_info,
            "platforms": platforms,
            "modules": modules,
            "shared_state": {},
        }

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
