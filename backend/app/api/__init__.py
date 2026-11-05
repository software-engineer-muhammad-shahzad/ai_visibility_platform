from flask import Blueprint

from .dashboard import dashboard_bp
from .pipeline_runs import pipeline_runs_bp
from .profiles import profiles_bp
from .queries import queries_bp

api_bp = Blueprint("api", __name__)
api_bp.register_blueprint(dashboard_bp)
api_bp.register_blueprint(pipeline_runs_bp)
api_bp.register_blueprint(profiles_bp)
api_bp.register_blueprint(queries_bp)

from . import health  # noqa: E402,F401  (registers routes on api_bp)
