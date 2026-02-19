"""Test case generation agent."""
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.base import BaseAgent
from app.ai.gemini_client import get_gemini_client
from app.ai.prompts.testcase import TESTCASE_SYSTEM_PROMPT, TESTCASE_USER_PROMPT


class TestCaseAgent(BaseAgent):
    """Agent for generating test cases from PRD."""

    @property
    def stage_type(self) -> str:
        return "testcases"

    async def generate(
        self,
        project_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Generate test cases based on PRD."""
        # Get PRD data
        prd_data = await self.get_previous_stage_data(project_id, "prd", db)

        if not prd_data or not prd_data.get("output_data"):
            raise ValueError("PRD stage data not found")

        prd_content = prd_data["output_data"]

        # Call Gemini API (using flash for speed)
        client = get_gemini_client("flash")

        prompt = TESTCASE_USER_PROMPT.format(
            prd=self._format_prd(prd_content),
        )

        result = await client.generate_json(
            prompt=prompt,
            system_instruction=TESTCASE_SYSTEM_PROMPT,
            temperature=0.5,
        )

        return result

    def _format_prd(self, prd: dict) -> str:
        """Format PRD as text for prompt."""
        lines = []

        if "title" in prd:
            lines.append(f"# {prd['title']}")

        if "modules" in prd:
            for module in prd["modules"]:
                lines.append(f"\n## {module.get('name', 'Module')}")
                if "features" in module:
                    for feature in module["features"]:
                        lines.append(f"### {feature.get('name', 'Feature')}")
                        lines.append(f"Description: {feature.get('description', '')}")
                        if "acceptance_criteria" in feature:
                            lines.append("Acceptance Criteria:")
                            for criteria in feature["acceptance_criteria"]:
                                lines.append(f"  - {criteria}")

        return "\n".join(lines)
