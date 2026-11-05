import os

from dotenv import load_dotenv

load_dotenv()  # must run before the env-reading classes below are evaluated


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///app.db")
    # Use the psycopg (v3) driver for plain postgres:// / postgresql:// URLs (e.g. Neon).
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JSON_SORT_KEYS = False
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}  # Neon suspends idle connections
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # run pipelines in a background thread and answer 202 immediately (the UI polls); false = block until done
    PIPELINE_ASYNC = os.getenv("PIPELINE_ASYNC", "true").lower() in ("1", "true", "yes")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    GEMINI_TIMEOUT_MS = int(os.getenv("GEMINI_TIMEOUT_MS", "60000"))
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",") if o.strip()]


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    PIPELINE_ASYNC = False  # deterministic tests; the async path has its own test


CONFIG_BY_NAME = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
