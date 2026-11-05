from dataclasses import dataclass

from app.utils.scoring import clamp, opportunity_score

from .base import AgentError, BaseAgent, extract_list

SYSTEM_INSTRUCTION = """You are a Visibility Scoring Agent. For each user question, do two things:
1. Estimate the question's typical monthly search volume (integer, realistic for the market) and the
   competitive difficulty of being cited for it (integer 0-100, higher = harder).
2. Simulate the answer an AI assistant would give and list the website domains (e.g. "example.com")
   it would cite or recommend, in the order they would appear, most prominent first. Use at most 8
   domains, bare domains only, and only domains you genuinely believe would be cited.
Respond ONLY with JSON:
{"results": [{"index": 0, "estimated_search_volume": 1200, "competitive_difficulty": 55, "cited_domains": ["a.com", "b.com"]}]}
Return exactly one result per input question, using the same "index"."""

BATCH_SIZE = 10

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer"},
                    "estimated_search_volume": {"type": "integer", "minimum": 0},
                    "competitive_difficulty": {"type": "integer", "minimum": 0, "maximum": 100},
                    "cited_domains": {"type": "array", "items": {"type": "string"}, "maxItems": 8},
                },
                "required": ["index", "estimated_search_volume", "competitive_difficulty", "cited_domains"],
            },
        }
    },
    "required": ["results"],
}


@dataclass
class QueryScore:
    estimated_search_volume: int
    competitive_difficulty: int
    domain_visible: bool
    visibility_position: int | None
    opportunity_score: float


def _bare(domain: str) -> str:
    return domain.lower().strip().removeprefix("https://").removeprefix("http://").removeprefix("www.").rstrip("/")


class ScoringAgent(BaseAgent):
    """Agent 2: score each query on volume, difficulty, visibility and opportunity."""

    name = "scoring"

    def __init__(self, llm):
        super().__init__(llm)
        self.errors: list[str] = []

    def run(self, domain: str, queries: list[str]) -> list[QueryScore | None]:
        """One QueryScore per query, or None where scoring failed (partial failures are tolerated)."""
        scores: list[QueryScore | None] = [None] * len(queries)
        for start in range(0, len(queries), BATCH_SIZE):
            batch = queries[start : start + BATCH_SIZE]
            try:
                scores[start : start + len(batch)] = self._score_batch(domain, batch)
            except AgentError as exc:  # one bad batch must not sink the whole run
                self.errors.append(str(exc))
        # the model sometimes skips items: give every unscored query one more chance
        missing = [i for i, s in enumerate(scores) if s is None]
        if missing and len(missing) < len(queries):
            try:
                for i, s in zip(missing, self._score_batch(domain, [queries[i] for i in missing])):
                    scores[i] = s
                self.errors.clear()
            except AgentError as exc:
                self.errors.append(str(exc))
        return scores

    def score_one(self, domain: str, query: str) -> QueryScore:
        score = self._score_batch(domain, [query])[0]
        if score is None:
            raise AgentError("scoring returned no usable result")
        return score

    def _score_batch(self, domain: str, batch: list[str]) -> list[QueryScore | None]:
        prompt = "Questions:\n" + "\n".join(f"{i}. {q}" for i, q in enumerate(batch))
        return self._ask(SYSTEM_INSTRUCTION, prompt, lambda data: self._validate(data, domain, len(batch)), RESPONSE_SCHEMA)

    @staticmethod
    def _validate(data, domain: str, count: int) -> list[QueryScore | None]:
        results = extract_list(data, "results")
        target = _bare(domain)
        out: list[QueryScore | None] = [None] * count
        for item in results:
            try:
                idx = int(item["index"])
                volume = max(0, int(item["estimated_search_volume"]))
                difficulty = int(clamp(float(item["competitive_difficulty"]), 0, 100))
                cited = [_bare(d) for d in item.get("cited_domains", []) if isinstance(d, str)]
            except (KeyError, TypeError, ValueError, AttributeError):
                continue  # skip a malformed item; the rest still count
            if not 0 <= idx < count:
                continue
            position = next((i + 1 for i, d in enumerate(cited) if d == target or d.endswith("." + target)), None)
            visible = position is not None
            out[idx] = QueryScore(volume, difficulty, visible, position, opportunity_score(volume, difficulty, visible, position))
        if all(s is None for s in out):
            raise ValueError("no valid scoring results in model response")
        return out
