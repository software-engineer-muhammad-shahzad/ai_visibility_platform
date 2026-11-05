from app.extensions import db

from .profile import iso, new_uuid, utcnow


class DiscoveredQuery(db.Model):
    """A question users ask AI assistants, with its scoring data."""

    __tablename__ = "discovered_queries"

    uuid = db.Column(db.String(36), primary_key=True, default=new_uuid)
    profile_uuid = db.Column(db.String(36), db.ForeignKey("business_profiles.uuid"), nullable=False, index=True)
    run_uuid = db.Column(db.String(36), db.ForeignKey("pipeline_runs.uuid"), nullable=False)
    query_text = db.Column(db.String(500), nullable=False)
    estimated_search_volume = db.Column(db.Integer)
    competitive_difficulty = db.Column(db.Integer)  # 0-100
    opportunity_score = db.Column(db.Float)  # 0.0-1.0, null until scored
    domain_visible = db.Column(db.Boolean)  # null = unknown (not scored)
    visibility_position = db.Column(db.Integer)  # null when not visible / unknown
    discovered_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    profile = db.relationship("BusinessProfile", back_populates="queries")
    recommendations = db.relationship("ContentRecommendation", back_populates="query", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "uuid": self.uuid,
            "profile_uuid": self.profile_uuid,
            "run_uuid": self.run_uuid,
            "query_text": self.query_text,
            "estimated_search_volume": self.estimated_search_volume,
            "competitive_difficulty": self.competitive_difficulty,
            "opportunity_score": self.opportunity_score,
            "domain_visible": self.domain_visible,
            "visibility_position": self.visibility_position,
            "discovered_at": iso(self.discovered_at),
        }
