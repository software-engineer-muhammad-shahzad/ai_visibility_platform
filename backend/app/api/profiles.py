import re
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request

from app.extensions import db
from app.models import BusinessProfile, ContentRecommendation, DiscoveredQuery, PipelineRun
from app.services.pipeline import run_pipeline

profiles_bp = Blueprint("profiles", __name__, url_prefix="/profiles")

# bare domain such as "surferseo.com" (no scheme, path or port)
DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$", re.IGNORECASE
)


def _validate(data: dict) -> tuple[dict, list[str]]:
    """Return (clean values, error messages) for a create-profile body."""
    errors: list[str] = []

    def text(key: str, required: bool = False) -> str | None:
        value = data.get(key)
        if value is None or (isinstance(value, str) and not value.strip()):
            if required:
                errors.append(f"{key} is required")
            return None
        if not isinstance(value, str):
            errors.append(f"{key} must be a string")
            return None
        return value.strip()

    name = text("name", required=True)
    domain = text("domain", required=True)
    industry = text("industry")
    description = text("description")

    if domain and not DOMAIN_RE.match(domain):
        errors.append(
            "domain must be a bare domain like example.com (no http://, paths or spaces)"
        )

    competitors = data.get("competitors", [])
    if not isinstance(competitors, list) or not all(
        isinstance(c, str) for c in competitors
    ):
        errors.append("competitors must be a list of domain strings")
        competitors = []
    competitors = list(dict.fromkeys(c.strip() for c in competitors if c.strip()))
    bad = [c for c in competitors if not DOMAIN_RE.match(c)]
    if bad:
        errors.append(f"invalid competitor domain(s): {', '.join(bad)}")

    clean = {
        "name": name,
        "domain": domain.lower() if domain else domain,
        "industry": industry,
        "description": description,
        "competitors": [c.lower() for c in competitors],
    }
    return clean, errors


@profiles_bp.post("")
def create_profile():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Request body must be a JSON object"), 400
    clean, errors = _validate(data)
    if errors:
        return jsonify(error="; ".join(errors), errors=errors), 400
    profile = BusinessProfile(**clean)
    db.session.add(profile)
    db.session.commit()
    return jsonify(profile.to_dict()), 201


@profiles_bp.get("/<profile_uuid>")
def get_profile(profile_uuid: str):
    profile = db.session.get(BusinessProfile, profile_uuid)
    if profile is None:
        return jsonify(error="Profile not found"), 404
    return jsonify(profile.to_dict())


@profiles_bp.get("")
def list_profiles():
    profiles = db.session.scalars(db.select(BusinessProfile).order_by(BusinessProfile.created_at.desc())).all()
    return jsonify([p.to_dict() for p in profiles])


def _profile_or_404(profile_uuid: str):
    profile = db.session.get(BusinessProfile, profile_uuid)
    if profile is None:
        return None, (jsonify(error="Profile not found"), 404)
    return profile, None


@profiles_bp.post("/<profile_uuid>/run")
def run_profile_pipeline(profile_uuid: str):
    """Run the discovery -> scoring -> recommendation pipeline. Only ever triggered by this explicit call."""
    profile, err = _profile_or_404(profile_uuid)
    if err:
        return err
    if profile.status == "running":
        latest = db.session.scalar(
            db.select(PipelineRun).filter_by(profile_uuid=profile.uuid).order_by(PipelineRun.started_at.desc()).limit(1)
        )
        started = latest.started_at if latest else None
        if started is not None and started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        # a run stuck in "running" for over 10 minutes (e.g. the server restarted mid-run) no longer blocks a new one
        if started is None or datetime.now(timezone.utc) - started < timedelta(minutes=10):
            return jsonify(error="A pipeline run is already in progress for this profile"), 409
    run = run_pipeline(profile)
    # 202 Accepted when the run continues in the background, 200 when it already finished; either way a
    # failed run is still a 2xx response - the run record carries the stage statuses and error_message
    return jsonify(run.to_dict()), 202 if current_app.config["PIPELINE_ASYNC"] else 200


@profiles_bp.get("/<profile_uuid>/queries")
def list_profile_queries(profile_uuid: str):
    profile, err = _profile_or_404(profile_uuid)
    if err:
        return err

    min_score = request.args.get("min_score", type=float)
    status = request.args.get("status")
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)
    if request.args.get("min_score") is not None and min_score is None:
        return jsonify(error="min_score must be a number between 0 and 1"), 400
    if status not in (None, "", "visible", "not_visible", "unknown"):
        return jsonify(error="status must be one of: visible, not_visible, unknown"), 400
    if page < 1 or not 1 <= per_page <= 100:
        return jsonify(error="page must be >= 1 and per_page between 1 and 100"), 400

    stmt = db.select(DiscoveredQuery).filter_by(profile_uuid=profile.uuid)
    if min_score is not None:
        stmt = stmt.where(DiscoveredQuery.opportunity_score >= min_score)
    if status == "visible":
        stmt = stmt.where(DiscoveredQuery.domain_visible.is_(True))
    elif status == "not_visible":
        stmt = stmt.where(DiscoveredQuery.domain_visible.is_(False))
    elif status == "unknown":
        stmt = stmt.where(DiscoveredQuery.domain_visible.is_(None))
    stmt = stmt.order_by(DiscoveredQuery.opportunity_score.desc().nulls_last(), DiscoveredQuery.discovered_at)

    pagination = db.paginate(stmt, page=page, per_page=per_page, error_out=False)
    return jsonify(
        queries=[q.to_dict() for q in pagination.items],
        total=pagination.total,
        page=page,
        per_page=per_page,
    )


@profiles_bp.get("/<profile_uuid>/recommendations")
def list_profile_recommendations(profile_uuid: str):
    profile, err = _profile_or_404(profile_uuid)
    if err:
        return err
    order = db.case({"high": 0, "medium": 1, "low": 2}, value=ContentRecommendation.priority, else_=3)
    recs = db.session.scalars(
        db.select(ContentRecommendation).filter_by(profile_uuid=profile.uuid).order_by(order, ContentRecommendation.created_at)
    ).all()
    return jsonify(recommendations=[r.to_dict() for r in recs])


@profiles_bp.get("/<profile_uuid>/runs")
def list_profile_runs(profile_uuid: str):
    profile, err = _profile_or_404(profile_uuid)
    if err:
        return err
    runs = db.session.scalars(
        db.select(PipelineRun).filter_by(profile_uuid=profile.uuid).order_by(PipelineRun.started_at.desc())
    ).all()
    return jsonify(runs=[r.to_dict() for r in runs])
