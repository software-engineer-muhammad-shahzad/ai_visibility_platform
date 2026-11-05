from app.models import BusinessProfile

from .base import BaseAgent, extract_list

SYSTEM_INSTRUCTION = """You are a Query Discovery Agent for an AI-visibility platform.
Given a business profile, generate realistic questions that real users type into AI assistants
(ChatGPT, Claude, Perplexity) when researching products or services in this business's market.
Rules:
- Produce between 10 and 20 DISTINCT questions.
- Mix intents: "best X" lists, "X vs Y" comparisons (use the listed competitors), "how to", pricing, alternatives.
- Do not repeat the brand name in every question; most should be category-level questions.
- Each question is a natural-language sentence under 140 characters.
Respond ONLY with JSON: {"queries": ["question 1", "question 2"]}"""

MIN_QUERIES, MAX_QUERIES = 10, 20

# JSON schema the model's output is constrained to (and that _validate re-checks)
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {"queries": {"type": "array", "items": {"type": "string"}, "minItems": MIN_QUERIES, "maxItems": MAX_QUERIES}},
    "required": ["queries"],
}


class DiscoveryAgent(BaseAgent):
    """Agent 1: generate 10-20 questions users ask AI assistants in the profile's space."""

    name = "discovery"

    def run(self, profile: BusinessProfile) -> list[str]:
        prompt = (
            f"Business name: {profile.name}\nDomain: {profile.domain}\nIndustry: {profile.industry or 'n/a'}\n"
            f"Description: {profile.description or 'n/a'}\nCompetitors: {', '.join(profile.competitors or []) or 'none'}"
        )
        return self._ask(SYSTEM_INSTRUCTION, prompt, self._validate, RESPONSE_SCHEMA)

    @staticmethod
    def _validate(data) -> list[str]:
        raw = extract_list(data, "queries")
        seen, queries = set(), []
        for item in raw:
            if not isinstance(item, str):
                continue
            text = " ".join(item.split())[:500]
            if text and text.lower() not in seen:
                seen.add(text.lower())
                queries.append(text)
        if len(queries) < MIN_QUERIES:
            raise ValueError(f"expected at least {MIN_QUERIES} valid queries, got {len(queries)}")
        return queries[:MAX_QUERIES]
