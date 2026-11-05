"""Orchestrator: discovery -> scoring -> recommendation, resumable at stage level.

Each stage has its own persisted status on the PipelineRun (pending|running|completed|failed).
`run_pipeline` creates a new run and executes every stage. `retry_pipeline` re-opens a failed run and
executes only the stages that are not yet completed, reusing the results already saved in the database.
"""
import logging
import threading
from datetime import datetime, timezone

from flask import current_app

from app.agents import AgentError, DiscoveryAgent, GeminiClient, RecommendationAgent, ScoringAgent
from app.extensions import db
from app.models import BusinessProfile, ContentRecommendation, DiscoveredQuery, PipelineRun
from app.utils.trace import banner, show

logger = logging.getLogger(__name__)

TOP_N_FOR_RECOMMENDATIONS = 5
STAGES = ("discovery", "scoring", "recommendation")
STAGE_TITLES = {
    "discovery": "AGENT 1 - Query Discovery",
    "scoring": "AGENT 2 - Visibility Scoring",
    "recommendation": "AGENT 3 - Content Recommendations",
}


class PipelineError(Exception):
    """A request that cannot be honoured (unknown run, nothing to retry, already running...)."""

    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def get_llm():
    """The LLM client; tests can inject a fake via app.extensions['llm']."""
    override = current_app.extensions.get("llm")
    if override is not None:
        return override
    cfg = current_app.config
    return GeminiClient(cfg["GEMINI_API_KEY"], cfg["GEMINI_MODEL"], cfg["GEMINI_TIMEOUT_MS"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _stage_status(run: PipelineRun, stage: str) -> str:
    return getattr(run, f"{stage}_status")


def _set_stage_status(run: PipelineRun, stage: str, status: str) -> None:
    setattr(run, f"{stage}_status", status)


# --------------------------------------------------------------------------------------- stages
# Stage functions change the session but never commit: _execute commits the stage's data together
# with its "completed" status, so a stage is either fully saved or not saved at all.


def _discovery_stage(run: PipelineRun, profile: BusinessProfile, llm) -> None:
    agent = DiscoveryAgent(llm)
    try:
        texts = agent.run(profile)
    finally:
        run.tokens_used += agent.tokens_used
    # new queries replace the previous results, but only once the agent has succeeded
    db.session.query(ContentRecommendation).filter_by(profile_uuid=profile.uuid).delete()
    db.session.query(DiscoveredQuery).filter_by(profile_uuid=profile.uuid).delete()
    db.session.add_all(DiscoveredQuery(profile_uuid=profile.uuid, run_uuid=run.uuid, query_text=t) for t in texts)
    run.queries_discovered = len(texts)
    run.queries_scored = 0
    show(f"AGENT 1 result - {len(texts)} validated queries", texts)


def _scoring_stage(run: PipelineRun, profile: BusinessProfile, llm) -> None:
    rows = db.session.scalars(
        db.select(DiscoveredQuery)
        .filter_by(profile_uuid=profile.uuid)
        .order_by(DiscoveredQuery.discovered_at, DiscoveredQuery.query_text)
    ).all()
    if not rows:
        raise AgentError("scoring has no discovered queries to score")
    todo = [r for r in rows if r.opportunity_score is None]  # already-scored queries are reused, not re-scored
    if len(todo) < len(rows):
        show("AGENT 2 reuse", f"{len(rows) - len(todo)} queries were already scored and are kept; scoring the other {len(todo)}")

    agent = ScoringAgent(llm)
    try:
        scores = agent.run(profile.domain, [r.query_text for r in todo])
    finally:
        run.tokens_used += agent.tokens_used
    for row, score in zip(todo, scores):
        if score is None:
            continue
        row.estimated_search_volume = score.estimated_search_volume
        row.competitive_difficulty = score.competitive_difficulty
        row.domain_visible = score.domain_visible
        row.visibility_position = score.visibility_position
        row.opportunity_score = score.opportunity_score
    show(
        f"AGENT 2 result - {sum(s is not None for s in scores)}/{len(todo)} queries scored in this attempt",
        [{"query": r.query_text, **(vars(s) if s else {"error": "not scored"})} for r, s in zip(todo, scores)],
    )

    run.queries_scored = sum(1 for r in rows if r.opportunity_score is not None)
    missing = len(rows) - run.queries_scored
    if missing:
        # the scores that did succeed stay saved; the stage is failed so a retry scores only the rest
        detail = f": {agent.errors[-1]}" if agent.errors else ""
        raise AgentError(f"{missing} of {len(rows)} queries could not be scored{detail}")


def _recommendation_stage(run: PipelineRun, profile: BusinessProfile, llm) -> None:
    targets = db.session.scalars(
        db.select(DiscoveredQuery)
        .filter_by(profile_uuid=profile.uuid, domain_visible=False)
        .where(DiscoveredQuery.opportunity_score.is_not(None))
        .order_by(DiscoveredQuery.opportunity_score.desc())
        .limit(TOP_N_FOR_RECOMMENDATIONS)
    ).all()
    if not targets:
        show("AGENT 3 skipped", "No scored queries where the domain is missing, so there is nothing to recommend")
        db.session.query(ContentRecommendation).filter_by(profile_uuid=profile.uuid).delete()
        return

    agent = RecommendationAgent(llm)
    try:
        recs = agent.run(profile, [(t.query_text, t.opportunity_score) for t in targets])
    finally:
        run.tokens_used += agent.tokens_used
    # idempotent: replace (never append to) whatever an earlier attempt may have stored
    db.session.query(ContentRecommendation).filter_by(profile_uuid=profile.uuid).delete()
    db.session.add_all(
        ContentRecommendation(
            profile_uuid=profile.uuid,
            query_uuid=targets[r.query_index].uuid,
            content_type=r.content_type,
            title=r.title,
            rationale=r.rationale,
            target_keywords=r.target_keywords,
            priority=r.priority,
        )
        for r in recs
    )
    show(
        f"AGENT 3 result - {len(recs)} recommendations",
        [{**vars(r), "target_query": targets[r.query_index].query_text} for r in recs],
    )


_STAGE_FUNCS = {"discovery": _discovery_stage, "scoring": _scoring_stage, "recommendation": _recommendation_stage}


# ------------------------------------------------------------------------------------ orchestration


def _execute(run: PipelineRun, profile: BusinessProfile) -> PipelineRun:
    """Run every stage of `run` that is not completed yet, stopping at the first failure."""
    run.status = "running"
    run.completed_at = None
    profile.status = "running"
    db.session.commit()

    llm = None
    for stage in STAGES:
        banner(STAGE_TITLES[stage])
        if _stage_status(run, stage) == "completed":
            show(f"{stage} skipped", "stage already completed - reusing the results saved in the database")
            continue

        _set_stage_status(run, stage, "running")
        db.session.commit()
        error: str | None = None
        try:
            llm = llm or get_llm()
            _STAGE_FUNCS[stage](run, profile, llm)
            _set_stage_status(run, stage, "completed")
            db.session.commit()  # the stage's data and its status are saved together
        except AgentError as exc:
            error = str(exc)  # partial data of this stage (e.g. some scores) stays in the session and is saved below
        except Exception as exc:  # unexpected: record it, never leave the run stuck in "running"
            logger.exception("Pipeline stage %s crashed for profile %s", stage, profile.uuid)
            db.session.rollback()
            error = f"Unexpected error: {exc}"

        if error is not None:
            run = db.session.get(PipelineRun, run.uuid)  # reload after a possible rollback
            profile = db.session.get(BusinessProfile, profile.uuid)
            _set_stage_status(run, stage, "failed")
            run.status = "failed"
            run.failed_stage = stage
            run.error_message = f"{stage} failed: {error}"
            profile.status = "failed"
            show(f"{stage.upper()} FAILED", error)
            break
    else:
        run.status = "completed"
        run.failed_stage = None
        run.error_message = None
        profile.status = "completed"

    run.completed_at = _now()
    db.session.commit()

    banner(f"PIPELINE {run.status.upper()} - saved to the database")
    show(
        "Saved",
        {
            "pipeline_run": run.uuid,
            "stages": {s: _stage_status(run, s) for s in STAGES},
            "failed_stage": run.failed_stage,
            "retry_count": run.retry_count,
            "queries_saved": run.queries_discovered,
            "queries_scored": run.queries_scored,
            "recommendations_saved": db.session.query(ContentRecommendation).filter_by(profile_uuid=profile.uuid).count(),
            "tokens_used": run.tokens_used,
            "error": run.error_message,
        },
    )
    return run


def _execute_by_uuid(run_uuid: str) -> PipelineRun:
    run = db.session.get(PipelineRun, run_uuid)
    return _execute(run, db.session.get(BusinessProfile, run.profile_uuid))


def _dispatch(run: PipelineRun) -> PipelineRun:
    """Execute the run now (PIPELINE_ASYNC=false) or hand it to a background thread and return immediately.

    The async path lets the HTTP request return 202 straight away; the UI then polls the run / profile status.
    """
    if not current_app.config.get("PIPELINE_ASYNC", False):
        return _execute_by_uuid(run.uuid)

    app = current_app._get_current_object()
    run_uuid = run.uuid

    def worker() -> None:
        with app.app_context():
            try:
                _execute_by_uuid(run_uuid)
            except Exception:  # last line of defence: never leave a run stuck in "running"
                logger.exception("Background pipeline crashed for run %s", run_uuid)
                db.session.rollback()
                crashed = db.session.get(PipelineRun, run_uuid)
                if crashed is not None and crashed.status == "running":
                    crashed.status = "failed"
                    crashed.error_message = "Pipeline crashed unexpectedly - see the server log"
                    crashed.completed_at = _now()
                    profile = db.session.get(BusinessProfile, crashed.profile_uuid)
                    if profile is not None:
                        profile.status = "failed"
                    db.session.commit()
            finally:
                db.session.remove()

    threading.Thread(target=worker, name=f"pipeline-{run_uuid[:8]}", daemon=True).start()
    return run


def run_pipeline(profile: BusinessProfile) -> PipelineRun:
    """Start a brand-new run: all three stages execute from the beginning. Never raises on agent failures."""
    banner(f"PIPELINE START - {profile.name} ({profile.domain})")
    run = PipelineRun(profile_uuid=profile.uuid, status="running")
    profile.status = "running"
    db.session.add(run)
    db.session.commit()
    return _dispatch(run)


def retry_pipeline(run_uuid: str) -> PipelineRun:
    """Resume a failed run in place: completed stages are skipped, the rest execute. No new run is created."""
    run = db.session.get(PipelineRun, run_uuid)
    if run is None:
        raise PipelineError("Pipeline run not found", 404)
    profile = db.session.get(BusinessProfile, run.profile_uuid)

    latest = db.session.scalar(
        db.select(PipelineRun).filter_by(profile_uuid=run.profile_uuid).order_by(PipelineRun.started_at.desc()).limit(1)
    )
    if latest is not None and latest.uuid != run.uuid:
        raise PipelineError("Only the latest pipeline run of a profile can be retried; start a new run instead", 409)

    # Atomic claim: only one request can flip failed -> running, so double-clicks / repeated calls can't
    # execute the same stage twice or duplicate rows.
    claimed = db.session.execute(
        db.update(PipelineRun)
        .where(PipelineRun.uuid == run_uuid, PipelineRun.status == "failed")
        .values(status="running", retry_count=PipelineRun.retry_count + 1)
    ).rowcount
    db.session.commit()
    if claimed != 1:
        db.session.refresh(run)
        state = "already running" if run.status == "running" else f"not failed (status: {run.status})"
        raise PipelineError(f"Nothing to retry: this pipeline run is {state}", 409)

    db.session.refresh(run)
    banner(f"PIPELINE RETRY #{run.retry_count} - {profile.name} ({profile.domain}) - resuming at '{run.failed_stage}'")
    profile.status = "running"
    db.session.commit()
    return _dispatch(run)


def recheck_query(query: DiscoveredQuery, profile: BusinessProfile) -> DiscoveredQuery:
    """Re-score a single query (Agent 2) and update it in place."""
    agent = ScoringAgent(get_llm())
    score = agent.score_one(profile.domain, query.query_text)
    query.estimated_search_volume = score.estimated_search_volume
    query.competitive_difficulty = score.competitive_difficulty
    query.domain_visible = score.domain_visible
    query.visibility_position = score.visibility_position
    query.opportunity_score = score.opportunity_score
    db.session.commit()
    return query
