"""Terminal trace of the pipeline: prints each agent's response as the run progresses."""
import json
from typing import Any

WIDTH = 78


def banner(title: str) -> None:
    print(f"\n{'=' * WIDTH}\n{title}\n{'=' * WIDTH}", flush=True)


def show(label: str, payload: Any) -> None:
    text = payload if isinstance(payload, str) else json.dumps(payload, indent=2, ensure_ascii=False, default=str)
    print(f"--- {label} ---\n{text}", flush=True)
