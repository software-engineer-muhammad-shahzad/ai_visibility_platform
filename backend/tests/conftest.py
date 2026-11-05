import pytest

from app import create_app
from app.agents.base import AgentError, LLMResult
from app.extensions import db


class FakeLLM:
    """Deterministic stand-in for Gemini; routes on the system prompt."""

    def __init__(self):
        self.fail_discovery = False
        self.fail_scoring = False
        self.fail_recommendation = False
        self.bad_json_once = False
        self.calls = {"discovery": 0, "scoring": 0, "recommendation": 0}  # how often each agent really ran

    def generate_json(self, system_instruction, user_prompt, temperature=0.4, response_schema=None):
        if "Query Discovery" in system_instruction:
            self.calls["discovery"] += 1
            if self.fail_discovery:
                raise AgentError("discovery boom")
            return LLMResult({"queries": [f"What is the best tool number {i}?" for i in range(12)]}, 100)
        if "Visibility Scoring" in system_instruction:
            self.calls["scoring"] += 1
            if self.fail_scoring:
                raise AgentError("boom")
            n = user_prompt.count("\n")  # one line per question
            results = [
                {
                    "index": i,
                    "estimated_search_volume": 5000,
                    "competitive_difficulty": 40,
                    "cited_domains": ["surferseo.com", "x.com"] if i == 0 else ["x.com", "y.com"],
                }
                for i in range(n)
            ]
            return LLMResult({"results": results}, 50)
        self.calls["recommendation"] += 1
        if self.fail_recommendation:
            raise AgentError("recommendation boom")
        if self.bad_json_once:
            self.bad_json_once = False
            return LLMResult({"nope": 1}, 5)
        return LLMResult(
            {
                "recommendations": [
                    {"query_index": 0, "content_type": "Blog Post", "title": "T", "rationale": "R",
                     "target_keywords": ["a", "b"], "priority": "HIGH"},
                    {"query_index": 99, "content_type": "faq", "title": "bad index", "priority": "low"},
                    {"query_index": 1, "content_type": "tweet", "title": "bad type", "priority": "low"},
                ]
            },
            20,
        )


@pytest.fixture
def app():
    app = create_app("testing")
    app.extensions["llm"] = FakeLLM()
    with app.app_context():
        db.create_all()
        yield app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def llm(app):
    return app.extensions["llm"]
