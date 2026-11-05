from app.agents.base import LLMResult
from app.agents.discovery import DiscoveryAgent
from app.agents.scoring import ScoringAgent


class ScriptedLLM:
    """Returns the queued payloads in order."""

    def __init__(self, *payloads):
        self.payloads = list(payloads)
        self.calls = 0

    def generate_json(self, system_instruction, user_prompt, temperature=0.4, response_schema=None):
        self.calls += 1
        return LLMResult(self.payloads.pop(0), 10)


def item(i, cited):
    return {"index": i, "estimated_search_volume": 1000, "competitive_difficulty": 30, "cited_domains": cited}


def test_scoring_accepts_a_bare_list_response():
    llm = ScriptedLLM([item(0, ["a.com", "surferseo.com"]), item(1, ["b.com"])])
    scores = ScoringAgent(llm).run("surferseo.com", ["q1", "q2"])
    assert scores[0].domain_visible and scores[0].visibility_position == 2
    assert scores[1].domain_visible is False


def test_scoring_retries_items_the_model_skipped():
    llm = ScriptedLLM({"results": [item(0, ["x.com"])]}, {"results": [item(0, ["surferseo.com"])]})
    scores = ScoringAgent(llm).run("surferseo.com", ["q1", "q2"])
    assert llm.calls == 2 and all(s is not None for s in scores)
    assert scores[1].visibility_position == 1


def test_discovery_accepts_a_bare_list_response():
    llm = ScriptedLLM([f"question {i}" for i in range(12)])
    assert len(DiscoveryAgent(llm).run(type("P", (), {"name": "n", "domain": "d.com", "industry": None, "description": None, "competitors": []})())) == 12
