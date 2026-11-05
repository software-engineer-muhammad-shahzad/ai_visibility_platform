from flask import Blueprint, jsonify

from app.agents import AgentError
from app.extensions import db
from app.models import BusinessProfile, DiscoveredQuery
from app.services.pipeline import recheck_query

queries_bp = Blueprint("queries", __name__, url_prefix="/queries")


@queries_bp.post("/<query_uuid>/recheck")
def recheck(query_uuid: str):
    """Re-run the scoring agent for one query and return the refreshed row."""
    query = db.session.get(DiscoveredQuery, query_uuid)
    if query is None:
        return jsonify(error="Query not found"), 404
    profile = db.session.get(BusinessProfile, query.profile_uuid)
    try:
        return jsonify(recheck_query(query, profile).to_dict())
    except AgentError as exc:
        db.session.rollback()
        return jsonify(error=f"Recheck failed: {exc}"), 502
