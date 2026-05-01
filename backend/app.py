"""
IDSFlow Flask app — Phase 2.

Responsibilities:
- Serve the React SPA from ./static (built by Vite into this directory).
- Expose JSON APIs for reference lookup, file upload extraction,
  PDF compliance checking, and SB/08 generation.
- Fall through to index.html for any non-/api path so client-side
  routing in the SPA continues to work.

What's NOT here yet (deferred to later phases):
- SSE streaming (Phase 5)
- Postgres-backed filings (Phase 4)
- Real re-PDF pipeline (Phase 5)
- Patricia write-back stub (Phase 4)
"""

from dotenv import load_dotenv
load_dotenv()

import io
import os
import tempfile
import time

from flask import Flask, abort, jsonify, request, send_file, send_from_directory

from ops_client import OPSClient
from pdf_compliance import check_pdf_compliance
from reference_extractor import extract_references
from sb08_pdf import generate_sb08_pdf

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

app = Flask(
    __name__,
    static_folder=STATIC_DIR,
    static_url_path="",
)

ops = OPSClient()

# Cap on how many references a single /api/lookup call will resolve.
# Higher numbers blow out the OPS rate budget and slow the response.
# 50 was the original cap and remains reasonable for the one-shot endpoint;
# the streaming variant in Phase 5 will lift this.
MAX_REFS_PER_LOOKUP = 50


# ---------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------

@app.route("/api/status")
def status():
    return jsonify({
        "app": "idsflow",
        "phase": 2,
        "live_mode": ops.live_mode,
        "credentials_loaded": bool(ops.consumer_key and ops.consumer_secret),
        "mode_label": (
            "LIVE — EPO OPS" if ops.live_mode
            else "DEMO MODE — no OPS credentials"
        ),
    })


# ---------------------------------------------------------------------
# Reference lookup (one-shot JSON — streaming variant lands in Phase 5)
# ---------------------------------------------------------------------

@app.route("/api/lookup", methods=["POST"])
def lookup():
    """Accept one or many reference numbers, return enriched records.

    Request body: { "references": [...] }   or   { "references": "text\nblob" }

    Each reference produces a record with bibliographic data, INPADOC
    family, English-equivalent suggestion (for foreign-language refs),
    and a translation flag for the UI to surface.
    """
    data = request.get_json(silent=True) or {}
    refs = data.get("references", [])

    if isinstance(refs, str):
        # Permit pasted blocks: split on newlines/commas/semicolons.
        refs = [
            r.strip()
            for r in refs.replace(",", "\n").replace(";", "\n").split("\n")
            if r.strip()
        ]

    if not refs:
        return jsonify({
            "error": "No references provided. Send {references: [\"JP2018-145672\", ...]}",
            "count": 0,
            "results": [],
        }), 400

    results = []
    for ref in refs[:MAX_REFS_PER_LOOKUP]:
        start = time.time()
        biblio = ops.get_bibliographic(ref)
        family = ops.get_family(ref)

        # Look for English-language family members — these are the
        # "corresponding" refs Wenderoth's paralegals use as the
        # primary IDS entry when the priority filing is non-English.
        english_equivalents = [
            f for f in family
            if isinstance(f, dict) and f.get("country") in ("US", "GB", "EP", "WO", "AU", "CA")
        ]

        needs_translation = False
        translation_note = ""
        if biblio.get("country") in ("JP", "CN", "KR", "DE", "FR"):
            if biblio.get("abstract_available"):
                translation_note = (
                    "English abstract available from Espacenet — will be used as page 1"
                )
            elif english_equivalents:
                eq = english_equivalents[0]
                translation_note = (
                    f"No English abstract, but {eq['country']}{eq['number']} "
                    "is an English-language family member"
                )
            else:
                needs_translation = True
                translation_note = (
                    "⚠ No English abstract or family equivalent — "
                    "flagged for manual translation"
                )

        elapsed = time.time() - start

        results.append({
            "input": ref,
            "biblio": biblio,
            "family": family,
            "english_equivalents": english_equivalents,
            "needs_translation": needs_translation,
            "translation_note": translation_note,
            "elapsed_ms": int(elapsed * 1000),
        })

    return jsonify({
        "count": len(results),
        "results": results,
        "truncated": len(refs) > MAX_REFS_PER_LOOKUP,
        "max_per_call": MAX_REFS_PER_LOOKUP,
    })


# ---------------------------------------------------------------------
# Reference extraction from uploaded files
# ---------------------------------------------------------------------

@app.route("/api/extract_references", methods=["POST"])
def extract_references_endpoint():
    """Accept an uploaded file (PDF, DOCX, XLSX, CSV, txt) and pull
    patent reference numbers out of its content.

    Returns the extracted refs plus a human-readable note describing
    what was parsed (handy for telling the user when OCR would be needed).
    """
    if "file" not in request.files:
        return jsonify({
            "error": "No file uploaded. Use form field 'file'.",
            "references": [],
        }), 400

    uploaded = request.files["file"]
    if not uploaded.filename:
        return jsonify({
            "error": "No file selected.",
            "references": [],
        }), 400

    file_bytes = uploaded.read()
    if len(file_bytes) > 25 * 1024 * 1024:
        return jsonify({
            "error": (
                f"File too large ({len(file_bytes) / 1024 / 1024:.1f} MB). "
                "Maximum is 25 MB. Split and upload in pieces."
            ),
            "references": [],
        }), 400

    refs, note = extract_references(uploaded.filename, file_bytes)

    return jsonify({
        "filename": uploaded.filename,
        "size_bytes": len(file_bytes),
        "references": refs,
        "reference_count": len(refs),
        "note": note,
    })


# ---------------------------------------------------------------------
# PDF compliance check (read-only — fixes land in Phase 5)
# ---------------------------------------------------------------------

@app.route("/api/compliance/check", methods=["POST"])
def compliance_check():
    """Inspect an uploaded PDF for USPTO compliance.
    Returns the structured report from pdf_compliance.check_pdf_compliance."""
    f = request.files.get("pdf") or request.files.get("file")
    if not f:
        return jsonify({
            "error": "No PDF uploaded. Use form field 'pdf' or 'file'.",
        }), 400

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    try:
        f.save(tmp.name)
        report = check_pdf_compliance(tmp.name)
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    return jsonify(report)


# ---------------------------------------------------------------------
# SB/08 generation
# ---------------------------------------------------------------------

@app.route("/api/sb08/generate", methods=["POST"])
def sb08_generate():
    """Generate a downloadable SB/08 PDF.

    Request body:
        results: [...]                          # output of /api/lookup
        case_stage: 'pre-FAOM' | 'before_first_action' | ...
        application: { app_number, filing_date, inventor, docket, art_unit, examiner }   # optional
        attorney:    { name, reg_number }                                                # optional

    Splits results into US vs. foreign patent tables based on country code.
    Returns a PDF as application/pdf.
    """
    data = request.get_json(silent=True) or {}
    case_stage = data.get("case_stage", "before_first_action")
    results = data.get("results", [])

    us_patents = []
    foreign_patents = []
    for r in results:
        biblio = r.get("biblio", {})
        country = biblio.get("country", "")
        applicants = biblio.get("applicants") or []
        applicant_str = applicants[0] if applicants else ""

        base = {
            "document_number": (
                f"{country}{biblio.get('number', '')}"
                if country == "US"
                else biblio.get("number", "")
            ),
            "kind_code": biblio.get("kind_code", ""),
            "publication_date": biblio.get("publication_date", ""),
            "applicant": applicant_str,
        }

        if country == "US":
            us_patents.append(base)
        else:
            foreign_patents.append({
                **base,
                "country_code": country,
                "has_english_family": bool(r.get("english_equivalents")),
            })

    application = data.get("application", {})
    attorney = data.get("attorney", {})

    sb08_data = {
        "application": {
            "app_number": application.get("app_number", ""),
            "filing_date": application.get("filing_date", ""),
            "inventor": application.get("inventor", ""),
            "docket": application.get("docket", ""),
            "art_unit": application.get("art_unit", ""),
            "examiner": application.get("examiner", ""),
        },
        "us_patents": us_patents,
        "foreign_patents": foreign_patents,
        "prosecution_stage": case_stage,
        "attorney": {
            "name": attorney.get("name", "Attorney Name"),
            "reg_number": attorney.get("reg_number", "00000"),
        },
    }

    pdf_bytes = generate_sb08_pdf(sb08_data)

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"SB08_{int(time.time())}.pdf",
    )


# ---------------------------------------------------------------------
# SPA fallback
# ---------------------------------------------------------------------

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def spa_fallback(path: str):
    # Don't accidentally swallow API 404s.
    if path.startswith("api/"):
        abort(404)

    candidate = os.path.join(STATIC_DIR, path)
    if path and os.path.isfile(candidate):
        return send_from_directory(STATIC_DIR, path)

    index_path = os.path.join(STATIC_DIR, "index.html")
    if not os.path.isfile(index_path):
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
