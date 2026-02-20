"""Gemini API client wrapper."""
import json
import base64
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

import google.generativeai as genai
from google import genai as genai_new
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

settings = get_settings()

# Get API key from settings or directly from environment
api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY", "")
print(f"Gemini API key configured: {'Yes' if api_key else 'No'} (length: {len(api_key)})")

if not api_key:
    print("WARNING: GEMINI_API_KEY is not set!")

# Configure Gemini (legacy API)
genai.configure(api_key=api_key)

# Configure new Gemini client for image generation (lazy initialization)
_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is None and api_key:
        _genai_client = genai_new.Client(api_key=api_key)
    return _genai_client


class GeminiClient:
    """Wrapper for Gemini API calls."""

    # Model configurations
    MODELS = {
        "pro": "gemini-2.5-pro",  # For complex reasoning
        "flash": "gemini-2.5-flash",  # For fast responses
        "flash-lite": "gemini-2.5-flash-lite",  # For cost-sensitive tasks
    }

    def __init__(self, model_type: str = "pro"):
        """Initialize client with specified model type."""
        model_name = self.MODELS.get(model_type, self.MODELS["pro"])
        self.model = genai.GenerativeModel(model_name)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.7,
        max_output_tokens: int = 8192,
    ) -> str:
        """Generate text response."""
        generation_config = genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )

        if system_instruction:
            model = genai.GenerativeModel(
                self.model.model_name,
                system_instruction=system_instruction,
            )
        else:
            model = self.model

        response = await model.generate_content_async(
            prompt,
            generation_config=generation_config,
        )

        return response.text

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def generate_json(
        self,
        prompt: str,
        system_instruction: str | None = None,
        schema: dict[str, Any] | None = None,
        temperature: float = 0.7,
        max_output_tokens: int = 8192,
    ) -> dict[str, Any]:
        """Generate JSON response with optional schema validation."""
        generation_config = genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
        )

        if schema:
            generation_config.response_schema = schema

        if system_instruction:
            model = genai.GenerativeModel(
                self.model.model_name,
                system_instruction=system_instruction,
            )
        else:
            model = self.model

        response = await model.generate_content_async(
            prompt,
            generation_config=generation_config,
        )

        # Parse JSON response
        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            # Try to extract JSON from response
            text = response.text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "9:16",
    ) -> str | None:
        """Generate image using Gemini native image generation.

        Uses gemini-3-pro-image-preview (Nano Banana Pro) model for UI mockup generation.
        This model has advanced reasoning for complex instructions and high-fidelity text rendering.
        Returns base64-encoded image data or None if generation fails.
        """
        import asyncio

        try:
            # Run synchronous API call in thread pool to avoid blocking
            client = get_genai_client()
            if not client:
                logger.error("Gemini client not initialized - API key missing")
                return None

            def _generate():
                return client.models.generate_content(
                    model="gemini-3-pro-image-preview",
                    contents=prompt,
                    config=genai_new.types.GenerateContentConfig(
                        response_modalities=["TEXT", "IMAGE"],
                        image_config=genai_new.types.ImageConfig(
                            aspect_ratio=aspect_ratio,
                        ),
                    ),
                )

            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(None, _generate)

            # Extract image from response parts
            if response.parts:
                for part in response.parts:
                    if part.inline_data is not None:
                        # Get image bytes and encode to base64
                        image_bytes = part.inline_data.data
                        if isinstance(image_bytes, bytes):
                            logger.info(f"[GeminiClient] Image generated: {len(image_bytes)} bytes")
                            return base64.b64encode(image_bytes).decode("utf-8")
                        elif isinstance(image_bytes, str):
                            # Already base64 encoded
                            return image_bytes

            logger.info(f"[GeminiClient] No image in response parts")
            return None
        except Exception as e:
            logger.info(f"[GeminiClient] Image generation failed: {e}")
            import traceback
            traceback.print_exc()
            return None


# Client cache by model type (thread-safe for async)
_clients: dict[str, GeminiClient] = {}


def get_gemini_client(model_type: str = "pro") -> GeminiClient:
    """Get Gemini client instance for specified model type."""
    if model_type not in _clients:
        _clients[model_type] = GeminiClient(model_type)
    return _clients[model_type]
