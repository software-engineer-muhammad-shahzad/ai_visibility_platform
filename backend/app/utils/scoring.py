"""Opportunity score formula (documented in the root README).

    volume_score   = min(1, log10(volume + 1) / log10(MAX_VOLUME + 1))      # 0..1, log scale
    ease           = 1 - difficulty / 100                                    # easier to win -> higher
    visibility_gap = 1.0                          if the domain is not cited
                     clamp((position - 1) / 10)   if cited at `position`     # already #1 -> 0 gap
    opportunity    = volume_score * (0.5 * ease + 0.5 * visibility_gap)      # 0..1

Search volume x competitive gap: a query only scores high when many people ask it AND the
domain can realistically win it AND the domain is not already winning it.
"""
import math

MAX_VOLUME = 100_000


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def opportunity_score(volume: int, difficulty: int, visible: bool, position: int | None) -> float:
    volume_score = clamp(math.log10(max(volume, 0) + 1) / math.log10(MAX_VOLUME + 1))
    ease = 1 - clamp(difficulty, 0, 100) / 100
    visibility_gap = clamp(((position or 1) - 1) / 10) if visible else 1.0
    return round(clamp(volume_score * (0.5 * ease + 0.5 * visibility_gap)), 4)
