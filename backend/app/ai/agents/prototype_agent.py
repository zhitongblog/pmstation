"""Prototype generation agent."""
import asyncio
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.base import BaseAgent
from app.ai.gemini_client import get_gemini_client
from app.ai.prompts.prototype import PROTOTYPE_SYSTEM_PROMPT, PROTOTYPE_USER_PROMPT


class PrototypeAgent(BaseAgent):
    """Agent for generating high-fidelity prototypes."""

    @property
    def stage_type(self) -> str:
        return "prototype"

    async def generate(
        self,
        project_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Generate prototype descriptions for each feature module."""
        import sys
        print(f"[PrototypeAgent] Starting generate for project {project_id}", flush=True)

        # Get previous stage data
        idea_data = await self.get_previous_stage_data(project_id, "idea", db)
        print(f"[PrototypeAgent] idea_data: {idea_data is not None}", flush=True)

        direction_data = await self.get_previous_stage_data(project_id, "direction", db)
        print(f"[PrototypeAgent] direction_data: {direction_data}", flush=True)

        features_data = await self.get_previous_stage_data(project_id, "features", db)
        print(f"[PrototypeAgent] features_data (v2): {features_data is not None}", flush=True)

        if not features_data:
            raise ValueError("Features stage data not found")

        # Safely extract idea content
        idea_content = ""
        if idea_data:
            input_data = idea_data.get("input_data") or {}
            idea_content = input_data.get("content", "")

        # Safely extract direction data
        selected_direction = {}
        if direction_data:
            selected_direction = direction_data.get("selected_option") or {}

        # Get selected features - handle None values safely
        output_data = features_data.get("output_data") or {}
        modules = output_data.get("modules") or []
        selected_option = features_data.get("selected_option") or {}
        selected_ids = selected_option.get("selected_ids") or []

        print(f"[PrototypeAgent] modules count: {len(modules)}, selected_ids: {selected_ids}", flush=True)

        if selected_ids:
            modules = self._filter_selected_modules(modules, selected_ids)

        # Call Gemini API to get screen descriptions
        client = get_gemini_client("pro")

        prompt = PROTOTYPE_USER_PROMPT.format(
            idea=idea_content,
            direction=selected_direction.get("title", ""),
            target_users=selected_direction.get("target_users", ""),
            modules=self._format_modules(modules),
        )

        result = await client.generate_json(
            prompt=prompt,
            system_instruction=PROTOTYPE_SYSTEM_PROMPT,
            temperature=0.7,
        )

        # Generate images for each screen
        screens = result.get("screens", [])
        if screens:
            result["screens"] = await self._generate_screen_images(
                screens,
                idea_content,
                selected_direction.get("title", ""),
                client,
            )

        return result

    async def _generate_screen_images(
        self,
        screens: list[dict],
        idea: str,
        direction: str,
        client,
    ) -> list[dict]:
        """Generate images for each screen using Imagen."""
        async def generate_single_image(screen: dict) -> dict:
            # Build image prompt from screen description
            image_prompt = self._build_image_prompt(screen, idea, direction)
            print(f"[PrototypeAgent] Generating image for screen: {screen.get('name')}")

            # Generate image
            image_data = await client.generate_image(
                prompt=image_prompt,
                aspect_ratio="9:16",  # Mobile app aspect ratio
            )

            if image_data:
                screen["image_data"] = image_data
                print(f"[PrototypeAgent] Image generated successfully for: {screen.get('name')}")
            else:
                print(f"[PrototypeAgent] Image generation failed for: {screen.get('name')}")

            return screen

        # Generate images concurrently (max 3 at a time to avoid rate limits)
        results = []
        for i in range(0, len(screens), 3):
            batch = screens[i:i + 3]
            batch_results = await asyncio.gather(
                *[generate_single_image(screen) for screen in batch]
            )
            results.extend(batch_results)

        return results

    def _build_image_prompt(self, screen: dict, idea: str, direction: str) -> str:
        """Build image generation prompt for UI mockup using Gemini native image generation."""
        components_desc = ""
        if "components" in screen:
            component_list = []
            for comp in screen["components"]:
                comp_type = comp.get("type", "element")
                comp_name = comp.get("name", "")
                comp_desc = comp.get("description", "")
                if comp_name or comp_desc:
                    component_list.append(f"{comp_type}: {comp_name} - {comp_desc}")
            components_desc = "\n- ".join(component_list[:8])  # Limit to 8 components

        layout_info = screen.get('layout', {})
        layout_type = layout_info.get('type', 'standard') if isinstance(layout_info, dict) else 'standard'
        sections = layout_info.get('sections', ['main']) if isinstance(layout_info, dict) else ['main']

        screen_name = screen.get('name', 'App Screen')
        screen_desc = screen.get('description', '')

        prompt = f"""Generate a professional mobile app UI screenshot mockup for a Chinese language application.

App Type: {direction}
Screen Name (Chinese): {screen_name}
Screen Purpose: {screen_desc}

UI Components to include:
- {components_desc if components_desc else 'Standard UI elements'}

CRITICAL Design Requirements:
1. This is a CHINESE language app - ALL text must be in Simplified Chinese (简体中文)
2. Use common Chinese UI text patterns:
   - Buttons: 登录, 注册, 确认, 取消, 提交, 返回
   - Labels: 用户名, 密码, 邮箱, 手机号
   - Navigation: 首页, 设置, 我的, 消息
3. Modern, minimalist iOS/Android app design
4. Clean white or light gray background
5. Professional blue (#2563EB) or purple accent color
6. Clear visual hierarchy with proper spacing (16px base unit)
7. Rounded corners (8-12px radius) on cards and buttons
8. Use Chinese-optimized fonts (PingFang SC, Noto Sans SC style)
9. Include iOS-style status bar at top (time, signal, battery)
10. Bottom navigation bar with Chinese labels if applicable

Screen "{screen_name}" should display:
{screen_desc}

IMPORTANT: Generate a realistic, production-quality mobile app screenshot. The Chinese text must be clear, legible, and properly rendered. This is NOT a wireframe - it should look like a real app screenshot."""

        return prompt

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

    def _format_modules(self, modules: list, indent: int = 0) -> str:
        """Format modules as text for prompt."""
        lines = []
        for module in modules:
            prefix = "  " * indent
            lines.append(f"{prefix}- {module.get('name', 'Unknown')}: {module.get('description', '')}")
            if "sub_features" in module and module["sub_features"]:
                lines.append(self._format_modules(module["sub_features"], indent + 1))
        return "\n".join(lines)
