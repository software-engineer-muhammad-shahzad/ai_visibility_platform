from dataclasses import dataclass

from app.models import BusinessProfile

from .base import BaseAgent, extract_list

CONTENT_TYPES = {"blog_post", "landing_page", "faq"}
PRIORITIES = {"high", "medium", "low"}

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "recommendations": {
            "type": "array",
            "minItems": 3,
            "maxItems": 5,
            "items": {
                "type": "object",
                "properties": {
                    "query_index": {"type": "integer", "minimum": 0},
                    "content_type": {"type": "string", "enum": sorted(CONTENT_TYPES)},
                    "title": {"type": "string"},
                    "rationale": {"type": "string"},
                    "target_keywords": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 6},
                    "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                },
                "required": ["query_index", "content_type", "title", "rationale", "target_keywords", "priority"],
            },
        }
    },
    "required": ["recommendations"],
}

SYSTEM_INSTRUCTION = """You are a Content Recommendation Agent for an AI-visibility platform.
The business below is NOT currently cited by AI assistants for the listed high-opportunity questions.
Generate 3 to 5 specific, actionable content recommendations that would help the business get cited.
For each recommendation provide:
- "query_index": index of the question it targets (from the list)
- "content_type": exactly one of "blog_post", "landing_page", "faq"
- "title": a concrete working title for the content piece
- "rationale": 1-2 sentences on why this content helps AI assistants cite the business
- "target_keywords": 3-6 keywords/phrases to target
- "priority": exactly one of "high", "medium", "low" (high for the highest opportunity)
Respond ONLY with JSON: {"recommendations": [{"query_index": 0, "content_type": "blog_post", "title": "...", "rationale": "...", "target_keywords": ["..."], "priority": "high"}]}"""


@dataclass
class Recommendation:
    query_index: int
    content_type: str
    title: str
    rationale: str
    target_keywords: list[str]
    priority: str


class RecommendationAgent(BaseAgent):
    """Agent 3: turn top not-visible queries into 3-5 content recommendations."""

    name = "recommendation"

    def run(self, profile: BusinessProfile, targets: list[tuple[str, float]]) -> list[Recommendation]:
        """`targets` = [(query_text, opportunity_score)] for the top not-visible queries."""
        lines = "\n".join(f"{i}. {text} (opportunity {score:.2f})" for i, (text, score) in enumerate(targets))
        prompt = (
            f"Business: {profile.name} ({profile.domain}), industry: {profile.industry or 'n/a'}\n"
            f"Description: {profile.description or 'n/a'}\nCompetitors: {', '.join(profile.competitors or []) or 'none'}\n"
            f"Questions:\n{lines}"
        )
        return self._ask(SYSTEM_INSTRUCTION, prompt, lambda data: self._validate(data, len(targets)), RESPONSE_SCHEMA)

    @staticmethod
    def _validate(data, count: int) -> list[Recommendation]:
        raw = extract_list(data, "recommendations")
        recs: list[Recommendation] = []
        for item in raw:
            try:
                idx = int(item["query_index"])
                ctype = str(item["content_type"]).lower().replace(" ", "_").replace("-", "_")
                priority = str(item["priority"]).lower()
                title = str(item["title"]).strip()
                rationale = str(item.get("rationale", "")).strip()
                keywords = [str(k).strip() for k in item.get("target_keywords", []) if str(k).strip()]
            except (KeyError, TypeError, ValueError, AttributeError):
                continue
            if not (0 <= idx < count and ctype in CONTENT_TYPES and priority in PRIORITIES and title):
                continue
            recs.append(Recommendation(idx, ctype, title[:300], rationale, keywords[:8], priority))
        if not recs:
            raise ValueError("no valid recommendations in model response")
        return recs[:5]
