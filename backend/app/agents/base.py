import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from app.utils.trace import show

logger = logging.getLogger(__name__)

TRANSIENT_RETRIES = 5  # attempts per call for 429/5xx/timeouts (the model is often busy)


class AgentError(Exception):
    """Raised when an agent cannot produce valid output."""


@dataclass
class LLMResult:
    data: Any
    tokens: int


class GeminiClient:
    """Thin wrapper around Google Gemini that returns parsed JSON and token usage."""

    def __init__(self, api_key: str, model: str, timeout_ms: int = 60000):
        if not api_key:
            raise AgentError("GEMINI_API_KEY is not configured")
        from google import genai  # imported lazily so tests don't need the SDK/network
        from google.genai import types

        self._types = types
        self._client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=timeout_ms))
        self.model = model

    def generate_json(
        self, system_instruction: str, user_prompt: str, temperature: float = 0.4, response_schema: dict | None = None
    ) -> LLMResult:
        # response_json_schema makes Gemini constrain its output to the agent's schema (structured output)
        config = self._types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_json_schema=response_schema,
            temperature=temperature,
        )
        response = None
        for attempt in range(1, TRANSIENT_RETRIES + 1):
            try:
                response = self._client.models.generate_content(model=self.model, contents=user_prompt, config=config)
                break
            except Exception as exc:  # network, auth, quota, timeout...
                transient = any(code in str(exc) for code in ("429", "500", "503", "504", "UNAVAILABLE", "timed out"))
                if transient and attempt < TRANSIENT_RETRIES:
                    time.sleep(4 * attempt)  # model busy: back off and retry
                    continue
                raise AgentError(f"Gemini request failed: {exc}") from exc
        tokens = getattr(getattr(response, "usage_metadata", None), "total_token_count", 0) or 0
        text = (response.text or "").strip()
        if text.startswith("```"):  # tolerate fenced JSON
            text = text.strip("`").removeprefix("json").strip()
        try:
            return LLMResult(json.loads(text), tokens)
        except (json.JSONDecodeError, TypeError) as exc:
            raise AgentError(f"Model returned invalid JSON: {exc}") from exc


def extract_list(data: Any, key: str) -> list:
    """The model sometimes returns the bare list instead of {"<key>": [...]}; accept both."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        value = data.get(key)
        if isinstance(value, list):
            return value
        raise ValueError(f"'{key}' must be a list")
    raise ValueError(f"expected a JSON object or list, got {type(data).__name__}")


class BaseAgent(ABC):
    """Common behaviour: call the LLM, validate the JSON, retry once on bad output."""

    name = "agent"
    max_attempts = 2

    def __init__(self, llm: GeminiClient):
        self.llm = llm
        self.tokens_used = 0

    def _ask(self, system_instruction: str, user_prompt: str, validate, schema: dict | None = None) -> Any:
        """Call the model until `validate(data)` returns a value (it raises ValueError/KeyError/TypeError on bad data)."""
        last_error: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                result = self.llm.generate_json(system_instruction, user_prompt, response_schema=schema)
                self.tokens_used += result.tokens
                show(f"{self.name.upper()} AGENT - raw model response ({result.tokens} tokens)", result.data)
                return validate(result.data)
            except (AgentError, ValueError, KeyError, TypeError) as exc:
                last_error = exc
                logger.warning("%s attempt %d failed: %s", self.name, attempt, exc)
        raise AgentError(f"{self.name} failed: {last_error}")

    @abstractmethod
    def run(self, *args, **kwargs):
        """Execute the agent."""
