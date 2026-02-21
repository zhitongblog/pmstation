"""AI Agents for different workflow stages."""
from typing import TYPE_CHECKING

from app.ai.agents.base import BaseAgent
from app.ai.agents.direction_agent import DirectionAgent
from app.ai.agents.feature_agent import FeatureAgent
from app.ai.agents.demo_agent import DemoAgent
from app.ai.agents.interactive_demo_agent import InteractiveDemoAgent
from app.ai.agents.prd_agent import PRDAgent
from app.ai.agents.testcase_agent import TestCaseAgent

# Agent registry (prototype removed - platform stage doesn't need AI generation)
# Note: DemoAgent is used for synchronous workflow generation
# InteractiveDemoAgent is available for SSE streaming endpoint
AGENTS: dict[str, type[BaseAgent]] = {
    "direction": DirectionAgent,
    "features": FeatureAgent,
    "demo": DemoAgent,  # Use original DemoAgent for stable workflow
    "prd": PRDAgent,
    "testcases": TestCaseAgent,
}


def get_agent(stage_type: str) -> BaseAgent:
    """Get agent instance for a stage type."""
    agent_class = AGENTS.get(stage_type)
    if not agent_class:
        raise ValueError(f"No agent found for stage type: {stage_type}")
    return agent_class()


__all__ = [
    "BaseAgent",
    "DirectionAgent",
    "FeatureAgent",
    "DemoAgent",
    "InteractiveDemoAgent",
    "PRDAgent",
    "TestCaseAgent",
    "get_agent",
]
