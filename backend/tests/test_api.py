VALID = {
    "name": "Surfer SEO",
    "domain": "surferseo.com",
    "industry": "SEO Software",
    "description": "AI-powered SEO content optimization tool",
    "competitors": ["clearscope.io", "marketmuse.com", "frase.io"],
}


def make_profile(client, **over):
    return client.post("/api/v1/profiles", json={**VALID, **over}).get_json()


def test_health(client):
    assert client.get("/api/v1/health").get_json() == {"status": "ok"}


def test_create_then_get_profile(client):
    res = client.post("/api/v1/profiles", json=VALID)
    assert res.status_code == 201
    created = res.get_json()
    assert created["status"] == "pending" and len(created["uuid"]) == 36
    got = client.get(f"/api/v1/profiles/{created['uuid']}")
    assert got.status_code == 200 and got.get_json() == created


def test_create_validation(client):
    assert client.post("/api/v1/profiles", json={}).status_code == 400
    bad = client.post("/api/v1/profiles", json={**VALID, "domain": "https://surferseo.com"})
    assert bad.status_code == 400 and "domain" in bad.get_json()["error"]
    assert client.post("/api/v1/profiles", data="nope").status_code == 400


def test_unknown_ids_return_404(client):
    calls = [
        ("get", "/profiles/x"),
        ("post", "/profiles/x/run"),
        ("get", "/profiles/x/queries"),
        ("get", "/profiles/x/recommendations"),
        ("post", "/queries/x/recheck"),
    ]
    for method, path in calls:
        res = getattr(client, method)("/api/v1" + path)
        assert res.status_code == 404 and "error" in res.get_json(), path


def test_list_profiles_newest_first(client):
    make_profile(client, name="A")
    make_profile(client, name="B")
    assert [p["name"] for p in client.get("/api/v1/profiles").get_json()] == ["B", "A"]


def test_creating_a_profile_does_not_start_the_pipeline(client):
    p = make_profile(client)
    assert p["status"] == "pending"
    assert client.get(f"/api/v1/profiles/{p['uuid']}/queries").get_json()["total"] == 0
    assert client.get("/api/v1/dashboard/summary").get_json()["recent_runs"] == []


def test_manual_run_full_pipeline(client):
    p = make_profile(client)
    run = client.post(f"/api/v1/profiles/{p['uuid']}/run").get_json()
    assert run["status"] == "completed"
    assert run["queries_discovered"] == 12 and run["queries_scored"] == 12 and run["tokens_used"] > 0
    assert client.get(f"/api/v1/profiles/{p['uuid']}").get_json()["status"] == "completed"

    q = client.get(f"/api/v1/profiles/{p['uuid']}/queries").get_json()
    assert q["total"] == 12
    visible = [x for x in q["queries"] if x["domain_visible"]]
    assert len(visible) == 2 and visible[0]["visibility_position"] == 1  # index 0 of each batch of 10
    scores = [x["opportunity_score"] for x in q["queries"]]
    assert scores == sorted(scores, reverse=True) and all(0 <= s <= 1 for s in scores)

    recs = client.get(f"/api/v1/profiles/{p['uuid']}/recommendations").get_json()["recommendations"]
    assert len(recs) == 1  # invalid items from the model were dropped
    assert recs[0]["content_type"] == "blog_post" and recs[0]["priority"] == "high"
    assert recs[0]["target_query_uuid"] and recs[0]["target_keywords"] == ["a", "b"]


def test_query_filters_and_pagination(client):
    p = make_profile(client)
    client.post(f"/api/v1/profiles/{p['uuid']}/run")
    base = f"/api/v1/profiles/{p['uuid']}/queries"
    assert client.get(base + "?status=visible").get_json()["total"] == 2
    assert client.get(base + "?status=not_visible").get_json()["total"] == 10
    assert client.get(base + "?status=unknown").get_json()["total"] == 0
    assert client.get(base + "?min_score=0.99").get_json()["total"] == 0
    page = client.get(base + "?page=2&per_page=5").get_json()
    assert len(page["queries"]) == 5 and page["total"] == 12 and page["page"] == 2
    assert client.get(base + "?status=bogus").status_code == 400
    assert client.get(base + "?min_score=abc").status_code == 400
    assert client.get(base + "?per_page=0").status_code == 400


def test_partial_failure_scoring_and_bad_llm_output(client, llm):
    llm.fail_scoring = True
    p = make_profile(client)
    run = client.post(f"/api/v1/profiles/{p['uuid']}/run").get_json()
    assert run["status"] == "failed" and run["failed_stage"] == "scoring"
    assert run["queries_discovered"] == 12 and run["queries_scored"] == 0
    assert "scoring failed" in run["error_message"]
    assert client.get(f"/api/v1/profiles/{p['uuid']}/queries?status=unknown").get_json()["total"] == 12


def test_bad_recommendation_json_is_retried(client, llm):
    llm.bad_json_once = True
    p = make_profile(client)
    run = client.post(f"/api/v1/profiles/{p['uuid']}/run").get_json()
    assert run["status"] == "completed"
    assert len(client.get(f"/api/v1/profiles/{p['uuid']}/recommendations").get_json()["recommendations"]) == 1


def test_missing_api_key_fails_run_cleanly(app, client):
    app.extensions.pop("llm")
    app.config["GEMINI_API_KEY"] = ""
    p = make_profile(client)
    run = client.post(f"/api/v1/profiles/{p['uuid']}/run").get_json()
    assert run["status"] == "failed" and "GEMINI_API_KEY" in run["error_message"]
    assert client.get(f"/api/v1/profiles/{p['uuid']}").get_json()["status"] == "failed"


def test_recheck_updates_query(client):
    p = make_profile(client)
    client.post(f"/api/v1/profiles/{p['uuid']}/run")
    q = client.get(f"/api/v1/profiles/{p['uuid']}/queries").get_json()["queries"][0]
    res = client.post(f"/api/v1/queries/{q['uuid']}/recheck")
    assert res.status_code == 200 and res.get_json()["uuid"] == q["uuid"]


def test_dashboard_summary(client):
    empty = client.get("/api/v1/dashboard/summary").get_json()
    assert empty["total_profiles"] == 0 and empty["average_opportunity_score"] is None
    p = make_profile(client)
    client.post(f"/api/v1/profiles/{p['uuid']}/run")
    s = client.get("/api/v1/dashboard/summary").get_json()
    assert s["total_profiles"] == 1 and s["total_queries"] == 12 and s["average_opportunity_score"] > 0
    assert s["recent_runs"][0]["business_name"] == "Surfer SEO"
