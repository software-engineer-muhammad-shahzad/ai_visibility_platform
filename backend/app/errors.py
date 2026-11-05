from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


def register_error_handlers(app: Flask) -> None:
    """Return JSON errors shaped as {"error": "..."} (the frontend interceptor reads `error`)."""

    @app.errorhandler(HTTPException)
    def handle_http_error(err: HTTPException):
        return jsonify(error=err.description or err.name), err.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(err: Exception):
        app.logger.exception("Unhandled error: %s", err)
        return jsonify(error="Internal server error"), 500
