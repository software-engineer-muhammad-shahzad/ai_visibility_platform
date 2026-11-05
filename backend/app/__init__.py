import os

from flask import Flask

from config import CONFIG_BY_NAME

from .errors import register_error_handlers
from .extensions import cors, db, migrate
from .api import api_bp


def create_app(config_name: str | None = None) -> Flask:
    """Application factory."""
    config_name = config_name or os.getenv("FLASK_ENV", "development")
    app = Flask(__name__)
    app.config.from_object(CONFIG_BY_NAME.get(config_name, CONFIG_BY_NAME["development"]))

    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    db.init_app(app)
    migrate.init_app(app, db)
    from . import models  # noqa: F401  (register models for migrations)

    app.register_blueprint(api_bp, url_prefix="/api/v1")
    register_error_handlers(app)
    return app
