"""
IDSFlow Flask app — Phase 1 skeleton.

Responsibilities right now:
- Serve the React SPA from ./static (built by Vite into this directory).
- Respond to /api/status (the only real endpoint in Phase 1).
- Fall through to index.html for any non-/api path so client-side routing works.

Phase 2 will port the real endpoints (OPS lookup, PDF compliance, SB/08 generation).
"""

from dotenv import load_dotenv
load_dotenv()

import os
from flask import Flask, jsonify, send_from_directory, abort

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

app = Flask(
    __name__,
    static_folder=STATIC_DIR,
    static_url_path="",  # serve assets at root, not /static
)


# ----- API -----

@app.route("/api/status")
def status():
    """Phase 1 health check. Real OPS detection lands in Phase 2."""
    return jsonify({
        "app": "idsflow",
        "phase": 1,
        "live_mode": False,
        "credentials_loaded": bool(
            os.environ.get("OPS_CONSUMER_KEY") and os.environ.get("OPS_CONSUMER_SECRET")
        ),
        "mode_label": "PHASE 1 — backend skeleton, frontend served from /static",
    })


# ----- SPA fallback -----
#
# The frontend is a single-page app with client-side routing (react-router).
# That means a request to e.g. /filings/abc-123 must return index.html so
# the browser can hydrate and let react-router resolve the path.
# Static assets (JS/CSS/images) are served by Flask's built-in static handler
# because of static_folder + static_url_path="" above.

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def spa_fallback(path: str):
    # Don't accidentally swallow API 404s
    if path.startswith("api/"):
        abort(404)

    # If the requested path matches a real file in /static, serve it.
    # (Flask's static handler usually catches these first; this is the safety net.)
    candidate = os.path.join(STATIC_DIR, path)
    if path and os.path.isfile(candidate):
        return send_from_directory(STATIC_DIR, path)

    # Otherwise fall through to the SPA shell.
    index_path = os.path.join(STATIC_DIR, "index.html")
    if not os.path.isfile(index_path):
        # Build hasn't happened yet (e.g. running `python app.py` before `npm run build`).
        return (
            "<!doctype html><meta charset=utf-8>"
            "<title>idsflow — frontend not built</title>"
            "<h1>Frontend bundle missing.</h1>"
            "<p>Run <code>cd frontend && npm install && npm run build</code> "
            "or use the Docker build, then refresh.</p>",
            500,
        )
    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5555))
    app.run(host="0.0.0.0", port=port, debug=True)
