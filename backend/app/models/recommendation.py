from app.extensions import db

from .profile import iso, new_uuid, utcnow


class ContentRecommendation(db.Model):
    """A content idea generated for a query where the domain is not visible."""

    __tablename__ = "content_recommendations"

    uuid = db.Column(db.String(36), primary_key=True, default=new_uuid)
    profile_uuid = db.Column(db.String(36), db.ForeignKey("business_profiles.uuid"), nullable=False, index=True)
    query_uuid = db.Column(db.String(36), db.ForeignKey("discovered_queries.uuid"), nullable=False)
    content_type = db.Column(db.String(30), nullable=False)  # blog_post | landing_page | faq
    title = db.Column(db.String(300), nullable=False)
    rationale = db.Column(db.Text)
    target_keywords = db.Column(db.JSON, nullable=False, default=list)
    priority = db.Column(db.String(10), nullable=False)  # high | medium | low
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    profile = db.relationship("BusinessProfile", back_populates="recommendations")
    query = db.relationship("DiscoveredQuery", back_populates="recommendations")

    def to_dict(self) -> dict:
        return {
            "recommendation_uuid": self.uuid,
            "profile_uuid": self.profile_uuid,
            "target_query_uuid": self.query_uuid,
            "content_type": self.content_type,
            "title": self.title,
            "rationale": self.rationale,
            "target_keywords": self.target_keywords or [],
            "priority": self.priority,
            "created_at": iso(self.created_at),
        }
