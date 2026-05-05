# routes/__init__.py

from .views  import views_bp
from .api    import api_bp
from .rules  import rules_bp
from .prayer import prayer_bp


def register_blueprints(app):
    """Register all route blueprints with the Flask app."""
    app.register_blueprint(views_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(rules_bp)
    app.register_blueprint(prayer_bp)
