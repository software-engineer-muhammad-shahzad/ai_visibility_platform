from flask import Blueprint, current_app, jsonify

from app.extensions import db
from app.models import PipelineRun
from app.services.pipeline import PipelineError, retry_pipeline

pipeline_runs_bp = Blueprint("pipeline_runs", __name__, url_prefix="/pipeline-runs")


@pipeline_runs_bp.get("/<run_uuid>")
def get_run(run_uuid: str):
    run = db.session.get(PipelineRun, run_uuid)
    if run is None:
        return jsonify(error="Pipeline run not found"), 404
    return jsonify(run.to_dict())


@pipeline_runs_bp.post("/<run_uuid>/retry")
def retry_run(run_uuid: str):
    """Resume a failed run: stages that already completed are skipped and their saved results reused."""
    try:
        run = retry_pipeline(run_uuid)  # 200 even if it fails again: stage statuses tell
        return jsonify(run.to_dict()), 202 if current_app.config["PIPELINE_ASYNC"] else 200
    except PipelineError as exc:
        return jsonify(error=exc.message), exc.status_code
