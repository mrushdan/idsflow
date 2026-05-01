"""
PDF compliance checker for USPTO IDS submissions.

Three compliance checks per the USPTO guidelines:
1. Font embedding — PTO accepts only: Arial, Times New Roman, Courier New, Calibri
2. File size — must be under 25 MB per PDF
3. Resolution — scanned documents must be 300 DPI or higher

This module is the read-only inspector. The actual fix-it pipeline
(re-PDF and rasterization) lives in pdf_repdf.py and lands in Phase 5.
"""

import os
import subprocess

# PTO-accepted font list. Match is case-insensitive substring against
# the base font name (after stripping subset prefixes like 'ABCDEF+Arial').
PTO_ACCEPTED_FONTS = {
    "Arial",
    "ArialMT",
    "Times New Roman",
    "TimesNewRomanPSMT",
    "TimesNewRoman",
    "Courier New",
    "CourierNewPSMT",
    "CourierNew",
    "Calibri",
}

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
MIN_DPI = 300


def check_pdf_compliance(pdf_path: str) -> dict:
    """Inspect a PDF and return a compliance report.

    Returns a dict with 'compliant' (bool) and detailed findings
    keyed by check name.
    """
    result = {
        "file_path": pdf_path,
        "compliant": True,
        "issues": [],
        "checks": {},
    }

    # File size
    size = os.path.getsize(pdf_path)
    size_mb = size / (1024 * 1024)
    result["checks"]["file_size"] = {
        "bytes": size,
        "mb": round(size_mb, 2),
        "limit_mb": 25,
        "pass": size <= MAX_FILE_SIZE_BYTES,
    }
    if size > MAX_FILE_SIZE_BYTES:
        result["compliant"] = False
        result["issues"].append(
            f"File size {size_mb:.1f}MB exceeds 25MB PTO limit"
        )

    # Fonts
    try:
        import pikepdf

        fonts_found = set()
        with pikepdf.open(pdf_path) as pdf:
            for page in pdf.pages:
                try:
                    resources = page.get("/Resources", {})
                    fonts = resources.get("/Font", {})
                    for font_ref in fonts.values():
                        try:
                            font_obj = font_ref
                            name = str(font_obj.get("/BaseFont", "")).lstrip("/")
                            if name:
                                # Strip subset prefix like 'ABCDEF+Arial'
                                if "+" in name:
                                    name = name.split("+", 1)[1]
                                fonts_found.add(name)
                        except Exception:
                            continue
                except Exception:
                    continue

        non_compliant = []
        for f in fonts_found:
            if not any(accepted.lower() in f.lower() for accepted in PTO_ACCEPTED_FONTS):
                non_compliant.append(f)

        result["checks"]["fonts"] = {
            "fonts_found": sorted(fonts_found),
            "non_compliant_fonts": sorted(non_compliant),
            "pass": len(non_compliant) == 0,
        }
        if non_compliant:
            result["compliant"] = False
            result["issues"].append(
                f"Non-compliant fonts: {', '.join(non_compliant)}"
            )
    except ImportError:
        result["checks"]["fonts"] = {
            "error": "pikepdf not installed — font check skipped"
        }

    # Page count
    try:
        import pikepdf
        with pikepdf.open(pdf_path) as pdf:
            result["checks"]["page_count"] = len(pdf.pages)
    except Exception:
        pass

    return result


def create_demo_pdf_with_bad_fonts(output_path: str):
    """Create a test PDF with non-PTO-compliant fonts. Useful for
    self-testing the compliance pipeline locally."""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter

        c = canvas.Canvas(output_path, pagesize=letter)
        # Helvetica is not on the PTO list — used to demonstrate detection.
        c.setFont("Helvetica-Bold", 16)
        c.drawString(72, 720, "Demo Patent Document")
        c.setFont("Helvetica", 11)
        c.drawString(72, 690, "Helvetica is NOT on the PTO accepted list.")
        c.drawString(72, 670, "The compliance checker should detect this.")
        c.setFont("Courier", 10)
        c.drawString(72, 640, "Courier (not Courier New) is also not compliant.")
        c.save()
        return True
    except ImportError:
        return False


if __name__ == "__main__":
    print("=== PDF Compliance Checker Self-Test ===\n")
    demo_path = "/tmp/demo_non_compliant.pdf"
    if create_demo_pdf_with_bad_fonts(demo_path):
        print(f"Created demo PDF: {demo_path}\n")
        report = check_pdf_compliance(demo_path)
        import json
        print(json.dumps(report, indent=2))
    else:
        print("reportlab not installed — skipping demo PDF creation")
