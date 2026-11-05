from flask import Blueprint, jsonify
from sqlalchemy import func

from app.extensions import db
from app.models import BusinessProfile, DiscoveredQuery, PipelineRun

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


@dashboard_bp.get("/summary")
def summary():
    """Aggregate figures for the dashboard: totals, average score, profiles and recent pipeline runs."""
    total_profiles = db.session.scalar(db.select(func.count()).select_from(BusinessProfile))
    total_queries = db.session.scalar(db.select(func.count()).select_from(DiscoveredQuery))
    scored, average = db.session.execute(
        db.select(func.count(DiscoveredQuery.opportunity_score), func.avg(DiscoveredQuery.opportunity_score))
    ).one()
    profiles = db.session.scalars(db.select(BusinessProfile).order_by(BusinessProfile.created_at.desc())).all()
    runs = db.session.execute(
        db.select(PipelineRun, BusinessProfile.name)
        .join(BusinessProfile, BusinessProfile.uuid == PipelineRun.profile_uuid)
        .order_by(PipelineRun.started_at.desc())
        .limit(10)
    ).all()
    return jsonify(
        total_profiles=total_profiles,
        total_queries=total_queries,
        scored_queries=scored,
        average_opportunity_score=round(float(average), 4) if average is not None else None,
        profiles=[p.to_dict() for p in profiles],
        recent_runs=[{**run.to_dict(), "business_name": name} for run, name in runs],
    )
