# ─── Smart City — Page Views ────────────────────────────────────────────────────

from flask import Blueprint, render_template

views_bp = Blueprint("views", __name__)


@views_bp.route("/")
def index():
    return render_template("index.html")

@views_bp.route("/docs")
def docs():
    return render_template("docs.html")
