from app.utils.scoring import opportunity_score


def test_formula_orders_sensibly():
    hidden_easy_big = opportunity_score(50000, 20, False, None)
    hidden_hard_big = opportunity_score(50000, 90, False, None)
    visible_first = opportunity_score(50000, 20, True, 1)
    tiny = opportunity_score(10, 20, False, None)
    assert hidden_easy_big > hidden_hard_big > 0
    assert hidden_easy_big > visible_first
    assert tiny < hidden_easy_big
    assert all(0 <= s <= 1 for s in (hidden_easy_big, hidden_hard_big, visible_first, tiny))
