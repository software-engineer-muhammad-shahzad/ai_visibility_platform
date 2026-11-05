"""Stage-level retry / resume of a pipeline run."""
from app.models import DiscoveredQuery, PipelineRun
from tests.test_api import make_profile


def start(client):
    p = make_profile(client)
    return p, client.post(f"/api/v1/profiles/{p['uuid']}/run").get_json()


def retry(client, run):
    return client.post(f"/api/v1/pipeline-runs/{run['uuid']}/retry")


def stages(run):
    return run["discovery_status"], run["scoring_status"], run["recommendation_status"]


def test_successful_run_has_all_stages_completed(client):
    _, run = start(client)
    assert run["status"] == "completed" and stages(run) == ("completed",) * 3 and run["failed_stage"] is None


def test_agent3_failure_then_retry_runs_only_agent3(client, llm):
    llm.fail_recommendation = True
    p, run = start(client)
    assert run["status"] == "failed" and run["failed_stage"] == "recommendation"
    assert stages(run) == ("completed", "completed", "failed")
    assert "recommendation failed" in run["error_message"]
    assert llm.calls == {"discovery": 1, "scoring": 2, "recommendation": 2}  # 2 = one call + the agent's own retry
    before = dict(llm.calls)
    assert client.get(f"/api/v1/profiles/{p['uuid']}/queries").get_json()["total"] == 12  # saved data is kept

    llm.fail_recommendation = False
    res = retry(client, run)
    done = res.get_json()
    assert res.status_code == 200 and done["status"] == "completed" and stages(done) == ("completed",) * 3
    assert done["uuid"] == run["uuid"] and done["retry_count"] == 1 and done["failed_stage"] is None
    assert done["error_message"] is None
    # agents 1 and 2 did NOT run again; only agent 3 did
    assert llm.calls["discovery"] == before["discovery"] and llm.calls["scoring"] == before["scoring"]
    assert llm.calls["recommendation"] == before["recommendation"] + 1
    recs = client.get(f"/api/v1/profiles/{p['uuid']}/recommendations").get_json()["recommendations"]
    assert len(recs) == 1
    assert client.get(f"/api/v1/profiles/{p['uuid']}/runs").get_json()["runs"].__len__() == 1  # no new run created


def test_agent2_failure_then_retry_runs_agent2_and_agent3_only(client, llm):
    llm.fail_scoring = True
    p, run = start(client)
    assert run["failed_stage"] == "scoring" and stages(run) == ("completed", "failed", "pending")
    assert llm.calls["recommendation"] == 0  # downstream agent never ran
    discovery_calls = llm.calls["discovery"]

    llm.fail_scoring = False
    done = retry(client, run).get_json()
    assert done["status"] == "completed" and stages(done) == ("completed",) * 3
    assert llm.calls["discovery"] == discovery_calls  # agent 1 not repeated
    assert llm.calls["recommendation"] == 1
    assert client.get(f"/api/v1/profiles/{p['uuid']}/queries").get_json()["total"] == 12  # no duplicates


def test_agent1_failure_then_retry_runs_everything_needed(client, llm):
    llm.fail_discovery = True
    p, run = start(client)
    assert run["failed_stage"] == "discovery" and stages(run) == ("failed", "pending", "pending")
    llm.fail_discovery = False
    done = retry(client, run).get_json()
    assert done["status"] == "completed" and stages(done) == ("completed",) * 3
    assert client.get(f"/api/v1/profiles/{p['uuid']}/queries").get_json()["total"] == 12


def test_stage_that_fails_again_keeps_failed_status_and_error(client, llm):
    llm.fail_recommendation = True
    _, run = start(client)
    again = retry(client, run).get_json()
    assert again["status"] == "failed" and again["failed_stage"] == "recommendation"
    assert again["recommendation_status"] == "failed" and again["retry_count"] == 1
    assert "recommendation boom" in again["error_message"]
    assert again["discovery_status"] == again["scoring_status"] == "completed"
    assert retry(client, run).get_json()["retry_count"] == 2  # can keep retrying


def test_scoring_retry_only_scores_the_unscored_queries(app, client, llm):
    llm.fail_scoring = True
    p, run = start(client)
    # simulate a partial earlier attempt: 8 of 12 queries already scored and saved
    from app.extensions import db

    rows = db.session.scalars(db.select(DiscoveredQuery).filter_by(profile_uuid=p["uuid"])).all()
    for r in rows[:8]:
        r.estimated_search_volume, r.competitive_difficulty = 100, 10
        r.domain_visible, r.opportunity_score = False, 0.5
    db.session.commit()

    llm.fail_scoring = False
    done = retry(client, run).get_json()
    assert done["status"] == "completed" and done["queries_scored"] == 12
    untouched = db.session.scalars(
        db.select(DiscoveredQuery).filter_by(profile_uuid=p["uuid"], opportunity_score=0.5)
    ).all()
    assert len(untouched) == 8  # previously scored rows were reused, not re-scored


def test_retry_rejected_when_nothing_to_retry(client):
    _, run = start(client)  # completed run
    res = retry(client, run)
    assert res.status_code == 409 and "Nothing to retry" in res.get_json()["error"]
    assert client.post("/api/v1/pipeline-runs/nope/retry").status_code == 404


def test_repeated_retry_requests_do_not_run_twice(client, llm):
    llm.fail_recommendation = True
    _, run = start(client)
    llm.fail_recommendation = False
    assert retry(client, run).status_code == 200
    calls = dict(llm.calls)
    assert retry(client, run).status_code == 409  # already completed: second request is a no-op
    assert llm.calls == calls


def test_only_latest_run_can_be_retried_and_new_run_starts_from_scratch(client, llm):
    llm.fail_recommendation = True
    p, old = start(client)
    llm.fail_recommendation = False
    new = client.post(f"/api/v1/profiles/{p['uuid']}/run").get_json()  # a completely new run
    assert new["uuid"] != old["uuid"] and stages(new) == ("completed",) * 3
    assert llm.calls["discovery"] == 2  # the new run executed all stages again
    res = retry(client, old)
    assert res.status_code == 409 and "latest" in res.get_json()["error"]


def test_stuck_running_run_cannot_be_retried(app, client):
    from app.extensions import db

    _, run = start(client)
    row = db.session.get(PipelineRun, run["uuid"])
    row.status = "running"
    db.session.commit()
    assert retry(client, run).status_code == 409


def test_get_pipeline_run(client):
    _, run = start(client)
    assert client.get(f"/api/v1/pipeline-runs/{run['uuid']}").get_json()["uuid"] == run["uuid"]
    assert client.get("/api/v1/pipeline-runs/nope").status_code == 404


def test_async_run_returns_202_and_completes_in_background(app, client):
    import time

    app.config["PIPELINE_ASYNC"] = True
    p = make_profile(client)
    res = client.post(f"/api/v1/profiles/{p['uuid']}/run")
    assert res.status_code == 202 and res.get_json()["status"] == "running"
    run = res.get_json()
    for _ in range(100):  # poll like the UI does
        current = client.get(f"/api/v1/pipeline-runs/{run['uuid']}").get_json()
        if current["status"] != "running":
            break
        time.sleep(0.05)
    assert current["status"] == "completed" and stages(current) == ("completed",) * 3
    assert client.get(f"/api/v1/profiles/{p['uuid']}").get_json()["status"] == "completed"
