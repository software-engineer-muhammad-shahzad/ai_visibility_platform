import uuid
from datetime import datetime, timezone

from app.extensions import db


def new_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


class BusinessProfile(db.Model):
    """A business whose AI-search visibility is tracked."""

    __tablename__ = "business_profiles"

    uuid = db.Column(db.String(36), primary_key=True, default=new_uuid)
    name = db.Column(db.String(200), nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    industry = db.Column(db.String(200))
    description = db.Column(db.Text)
    competitors = db.Column(db.JSON, nullable=False, default=list)
    status = db.Column(db.String(30), nullable=False, default="pending")  # pending|running|completed|failed
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    runs = db.relationship("PipelineRun", back_populates="profile", cascade="all, delete-orphan")
    queries = db.relationship("DiscoveredQuery", back_populates="profile", cascade="all, delete-orphan")
    recommendations = db.relationship("ContentRecommendation", back_populates="profile", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "uuid": self.uuid,
            "name": self.name,
            "domain": self.domain,
            "industry": self.industry,
            "description": self.description,
            "competitors": self.competitors or [],
            "status": self.status,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }


class PipelineRun(db.Model):
    """One execution of the discovery -> scoring -> recommendation pipeline."""

    __tablename__ = "pipeline_runs"

    uuid = db.Column(db.String(36), primary_key=True, default=new_uuid)
    profile_uuid = db.Column(db.String(36), db.ForeignKey("business_profiles.uuid"), nullable=False, index=True)
    status = db.Column(db.String(30), nullable=False, default="running")  # running|completed|failed
    # independent stage tracking (pending|running|completed|failed) so a retry can resume where it stopped
    discovery_status = db.Column(db.String(20), nullable=False, default="pending", server_default="pending")
    scoring_status = db.Column(db.String(20), nullable=False, default="pending", server_default="pending")
    recommendation_status = db.Column(db.String(20), nullable=False, default="pending", server_default="pending")
    failed_stage = db.Column(db.String(20))  # discovery|scoring|recommendation, null when nothing failed
    retry_count = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    queries_discovered = db.Column(db.Integer, nullable=False, default=0)
    queries_scored = db.Column(db.Integer, nullable=False, default=0)
    tokens_used = db.Column(db.Integer, nullable=False, default=0)
    error_message = db.Column(db.Text)
    started_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    completed_at = db.Column(db.DateTime(timezone=True))

    profile = db.relationship("BusinessProfile", back_populates="runs")

    def to_dict(self) -> dict:
        return {
            "uuid": self.uuid,
            "profile_uuid": self.profile_uuid,
            "status": self.status,
            "discovery_status": self.discovery_status,
            "scoring_status": self.scoring_status,
            "recommendation_status": self.recommendation_status,
            "failed_stage": self.failed_stage,
            "retry_count": self.retry_count,
            "queries_discovered": self.queries_discovered,
            "queries_scored": self.queries_scored,
            "tokens_used": self.tokens_used,
            "error_message": self.error_message,
            "started_at": iso(self.started_at),
            "completed_at": iso(self.completed_at),
        }
