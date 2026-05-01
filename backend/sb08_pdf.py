"""
SB/08 PDF generator — produces a filing-format PTO/SB/08a document.

Generates the US Patent Documents citation table format matching the
March 2026 USPTO template layout. For now this produces PDFs that
look like the real form; later we can swap to form-filling the
official USPTO template directly.

Prosecution-stage-aware certification language drives the footer block
(per 37 CFR 1.97).
"""

import io
from datetime import datetime
from typing import Dict

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Table,
    TableStyle,
    Spacer,
    KeepTogether,
)


# Certification language keyed by prosecution stage. Any change here
# should also be reflected in the frontend's stage-certification map
# in frontend/src/data/fixtures.ts to keep the preview consistent.
CERTIFICATIONS = {
    "before_first_action": {
        "title": "No certification required",
        "body": (
            "This Information Disclosure Statement is being filed before the "
            "mailing date of a first Office action on the merits. No "
            "certification under 37 CFR 1.97(e) is required. No fee under "
            "37 CFR 1.17(p) is required under 37 CFR 1.97(b)."
        ),
    },
    "after_first_action": {
        "title": "Certification under 37 CFR 1.97(e)(1)",
        "body": (
            "The undersigned certifies, in accordance with 37 CFR 1.97(e)(1), "
            "that each item of information contained in the information "
            "disclosure statement was first cited in any communication from a "
            "foreign patent office in a counterpart foreign application not "
            "more than three months prior to the filing of this information "
            "disclosure statement. No fee under 37 CFR 1.17(p) is required."
        ),
    },
    "final_action": {
        "title": "Certification under 37 CFR 1.97(e)",
        "body": (
            "Certification under 37 CFR 1.97(e) is required for this IDS. The "
            "fee set forth in 37 CFR 1.17(p) may apply. The undersigned "
            "certifies either that each item was first cited in a communication "
            "from a foreign patent office not more than three months prior, or "
            "that no item of information was known to any individual designated "
            "in 37 CFR 1.56(c) more than three months prior to filing."
        ),
    },
    "notice_of_allowance": {
        "title": "Petition under 37 CFR 1.313(c)(2)",
        "body": (
            "Petition under 37 CFR 1.313(c)(2) to withdraw the application from "
            "issue is submitted herewith. The IDS is accompanied by a petition "
            "to withdraw and the fee set forth in 37 CFR 1.17(h). Processing "
            "fee under 37 CFR 1.17(i) applies."
        ),
    },
}

# Map the frontend's stage names (pre-FAOM, etc.) to our backend keys.
# Both must be supported because the frontend uses one set and the
# old code used the other.
STAGE_ALIASES = {
    "pre-FAOM": "before_first_action",
    "post-FAOM": "after_first_action",
    "post-Notice": "final_action",
    "post-Issue": "notice_of_allowance",
}


def resolve_stage(stage: str) -> str:
    """Accept either the frontend's pre-FAOM-style names or the
    backend's before_first_action-style names. Returns the backend key."""
    return STAGE_ALIASES.get(stage, stage)


def _build_styles():
    """Typography styles matching the PTO form aesthetic.
    The official form uses Times New Roman 10pt for body, 7pt for
    disclaimers — we match that."""
    styles = getSampleStyleSheet()
    return {
        "form_header": ParagraphStyle(
            "form_header",
            parent=styles["Heading1"],
            fontName="Times-Bold",
            fontSize=11,
            alignment=TA_CENTER,
            spaceAfter=2,
            leading=13,
        ),
        "form_subheader": ParagraphStyle(
            "form_subheader",
            parent=styles["Normal"],
            fontName="Times-Roman",
            fontSize=8,
            alignment=TA_CENTER,
            spaceAfter=8,
            leading=10,
        ),
        "label": ParagraphStyle(
            "label",
            parent=styles["Normal"],
            fontName="Times-Roman",
            fontSize=7,
            textColor=colors.HexColor("#333333"),
            leading=9,
        ),
        "value": ParagraphStyle(
            "value",
            parent=styles["Normal"],
            fontName="Times-Bold",
            fontSize=9,
            leading=11,
        ),
        "cert_title": ParagraphStyle(
            "cert_title",
            parent=styles["Normal"],
            fontName="Times-Bold",
            fontSize=10,
            spaceAfter=4,
        ),
        "cert_body": ParagraphStyle(
            "cert_body",
            parent=styles["Normal"],
            fontName="Times-Roman",
            fontSize=9,
            alignment=TA_JUSTIFY,
            leading=12,
        ),
        "omb": ParagraphStyle(
            "omb",
            parent=styles["Normal"],
            fontName="Times-Italic",
            fontSize=7,
            textColor=colors.HexColor("#555555"),
            leading=9,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=styles["Normal"],
            fontName="Times-Roman",
            fontSize=7,
            textColor=colors.HexColor("#555555"),
            alignment=TA_CENTER,
            leading=9,
        ),
    }


def _build_header_block(styles, application_data):
    """Top metadata block — application number, filing date, inventor, etc.
    Rendered as a 4-column table like the real form."""
    rows = [
        [
            Paragraph("<b>Application Number</b>", styles["label"]),
            Paragraph("<b>Filing Date</b>", styles["label"]),
            Paragraph("<b>First Named Inventor</b>", styles["label"]),
            Paragraph("<b>Attorney Docket Number</b>", styles["label"]),
        ],
        [
            Paragraph(application_data.get("app_number", ""), styles["value"]),
            Paragraph(application_data.get("filing_date", ""), styles["value"]),
            Paragraph(application_data.get("inventor", ""), styles["value"]),
            Paragraph(application_data.get("docket", ""), styles["value"]),
        ],
        [
            Paragraph("<b>Art Unit</b>", styles["label"]),
            Paragraph("<b>Examiner Name</b>", styles["label"]),
            Paragraph("<b>Sheet</b>", styles["label"]),
            Paragraph("<b>of</b>", styles["label"]),
        ],
        [
            Paragraph(application_data.get("art_unit", ""), styles["value"]),
            Paragraph(application_data.get("examiner", ""), styles["value"]),
            Paragraph("1", styles["value"]),
            Paragraph("1", styles["value"]),
        ],
    ]

    t = Table(rows, colWidths=[1.75 * inch, 1.75 * inch, 1.75 * inch, 1.75 * inch])
    t.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#f0f0f0")),
            ]
        )
    )
    return t


def _build_us_patents_table(styles, references):
    """Main citation table — matches SB/08a column layout."""
    header = [
        Paragraph("<b>Examiner<br/>Initials*</b>", styles["label"]),
        Paragraph("<b>Cite<br/>No.<super>1</super></b>", styles["label"]),
        Paragraph("<b>Document Number</b>", styles["label"]),
        Paragraph("<b>Kind<br/>Code<super>2</super></b>", styles["label"]),
        Paragraph("<b>Publication<br/>Date</b>", styles["label"]),
        Paragraph("<b>Name of Patentee or Applicant<br/>of cited Document</b>", styles["label"]),
        Paragraph("<b>Pages, Columns, Lines,<br/>Where Relevant Passages<br/>Appear</b>", styles["label"]),
    ]

    rows = [header]
    for i, ref in enumerate(references, start=1):
        rows.append(
            [
                Paragraph("", styles["value"]),  # Examiner fills in
                Paragraph(str(i), styles["value"]),
                Paragraph(ref.get("document_number", ""), styles["value"]),
                Paragraph(ref.get("kind_code", ""), styles["value"]),
                Paragraph(ref.get("publication_date", ""), styles["value"]),
                Paragraph(ref.get("applicant", ""), styles["value"]),
                Paragraph("", styles["value"]),  # Attorney fills in
            ]
        )

    # Pad to keep the form aesthetic when sparsely populated.
    rows_to_add = max(0, 6 - len(references))
    for _ in range(rows_to_add):
        rows.append([Paragraph("", styles["value"])] * 7)

    col_widths = [
        0.6 * inch, 0.4 * inch, 1.4 * inch, 0.5 * inch,
        0.9 * inch, 1.8 * inch, 1.4 * inch,
    ]

    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e8e8")),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (1, 0), (1, -1), "CENTER"),
                ("ALIGN", (3, 0), (3, -1), "CENTER"),
            ]
        )
    )
    return t


def _build_foreign_patents_table(styles, references):
    """Foreign patent docs section — different columns from US."""
    header = [
        Paragraph("<b>Examiner<br/>Initials*</b>", styles["label"]),
        Paragraph("<b>Cite<br/>No.<super>1</super></b>", styles["label"]),
        Paragraph("<b>Foreign Document Number<super>3</super></b>", styles["label"]),
        Paragraph("<b>Country<br/>Code<super>3</super></b>", styles["label"]),
        Paragraph("<b>Kind<br/>Code<super>4</super></b>", styles["label"]),
        Paragraph("<b>Publication<br/>Date</b>", styles["label"]),
        Paragraph("<b>Name of Patentee or Applicant<br/>of cited Document</b>", styles["label"]),
        Paragraph("<b>Pages, Columns, Lines,<br/>Where Relevant Passages<br/>Appear</b>", styles["label"]),
        Paragraph("<b>T<super>5</super></b>", styles["label"]),
    ]

    rows = [header]
    for i, ref in enumerate(references, start=1):
        rows.append(
            [
                Paragraph("", styles["value"]),
                Paragraph(str(i), styles["value"]),
                Paragraph(ref.get("document_number", ""), styles["value"]),
                Paragraph(ref.get("country_code", ""), styles["value"]),
                Paragraph(ref.get("kind_code", ""), styles["value"]),
                Paragraph(ref.get("publication_date", ""), styles["value"]),
                Paragraph(ref.get("applicant", ""), styles["value"]),
                Paragraph("", styles["value"]),
                Paragraph("X" if ref.get("has_english_family") else "", styles["value"]),
            ]
        )

    rows_to_add = max(0, 6 - len(references))
    for _ in range(rows_to_add):
        rows.append([Paragraph("", styles["value"])] * 9)

    col_widths = [
        0.6 * inch, 0.4 * inch, 1.2 * inch, 0.5 * inch, 0.5 * inch,
        0.9 * inch, 1.7 * inch, 1.0 * inch, 0.2 * inch,
    ]

    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e8e8")),
                ("ALIGN", (0, 0), (1, -1), "CENTER"),
                ("ALIGN", (3, 0), (4, -1), "CENTER"),
                ("ALIGN", (8, 0), (8, -1), "CENTER"),
            ]
        )
    )
    return t


def _build_certification_block(styles, prosecution_stage, attorney_name, attorney_reg):
    """Certification block — stage-aware language."""
    stage_key = resolve_stage(prosecution_stage)
    cert = CERTIFICATIONS.get(stage_key, CERTIFICATIONS["before_first_action"])

    signature_table = Table(
        [
            [
                Paragraph("<b>/Signature/</b>", styles["value"]),
                Paragraph(f"<b>{attorney_name}</b>", styles["value"]),
                Paragraph(f"Reg. No. {attorney_reg}", styles["value"]),
                Paragraph(datetime.now().strftime("%Y-%m-%d"), styles["value"]),
            ]
        ],
        colWidths=[1.5 * inch, 2.2 * inch, 1.5 * inch, 1.8 * inch],
    )
    signature_table.setStyle(
        TableStyle(
            [
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.black),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    signature_labels = Table(
        [
            [
                Paragraph("Signature", styles["label"]),
                Paragraph("Printed Name", styles["label"]),
                Paragraph("Registration No.", styles["label"]),
                Paragraph("Date (YYYY-MM-DD)", styles["label"]),
            ]
        ],
        colWidths=[1.5 * inch, 2.2 * inch, 1.5 * inch, 1.8 * inch],
    )

    return [
        Paragraph(cert["title"], styles["cert_title"]),
        Paragraph(cert["body"], styles["cert_body"]),
        Spacer(1, 20),
        signature_table,
        signature_labels,
    ]


def _draw_footer(canvas, doc):
    """IDSFlow footer on every page."""
    canvas.saveState()
    canvas.setFont("Times-Italic", 7)
    canvas.setFillColor(colors.HexColor("#777777"))
    canvas.drawString(
        0.5 * inch,
        0.3 * inch,
        "Generated by IDSFlow  —  Prototype Only  —  Not for actual USPTO filing",
    )
    canvas.drawRightString(
        letter[0] - 0.5 * inch,
        0.3 * inch,
        f"Page {doc.page}",
    )
    canvas.restoreState()


def generate_sb08_pdf(sb08_data: Dict) -> bytes:
    """Main entry point.

    Expected input shape:
        application: {app_number, filing_date, inventor, docket, art_unit, examiner}
        us_patents: [{document_number, kind_code, publication_date, applicant}, ...]
        foreign_patents: [{document_number, country_code, kind_code,
                           publication_date, applicant, has_english_family}, ...]
        prosecution_stage: 'before_first_action' | 'after_first_action' |
                           'final_action' | 'notice_of_allowance'
                          (or the frontend's pre-FAOM / post-FAOM / post-Notice / post-Issue)
        attorney: {name, reg_number}

    Returns the PDF as bytes.
    """
    styles = _build_styles()
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
        title="PTO/SB/08a Information Disclosure Statement",
        author="IDSFlow",
    )

    story = []

    # Form identifier at very top
    story.append(
        Paragraph(
            "PTO/SB/08a (Updated March 2026)  —  Approved for use through 11/30/2027  —  OMB 0651-0031",
            styles["omb"],
        )
    )
    story.append(
        Paragraph(
            "U.S. Patent and Trademark Office &nbsp;&middot;&nbsp; U.S. DEPARTMENT OF COMMERCE",
            styles["omb"],
        )
    )
    story.append(Spacer(1, 8))

    # Title
    story.append(Paragraph("INFORMATION DISCLOSURE", styles["form_header"]))
    story.append(Paragraph("STATEMENT BY APPLICANT", styles["form_header"]))
    story.append(
        Paragraph(
            "<i>(Use as many sheets as necessary)</i>",
            styles["form_subheader"],
        )
    )

    # Application metadata block
    story.append(_build_header_block(styles, sb08_data.get("application", {})))
    story.append(Spacer(1, 14))

    us_patents = sb08_data.get("us_patents", [])
    if us_patents:
        story.append(Paragraph("<b>U.S. PATENT DOCUMENTS</b>", styles["cert_title"]))
        story.append(Spacer(1, 4))
        story.append(_build_us_patents_table(styles, us_patents))
        story.append(Spacer(1, 14))

    foreign_patents = sb08_data.get("foreign_patents", [])
    if foreign_patents:
        story.append(Paragraph("<b>FOREIGN PATENT DOCUMENTS</b>", styles["cert_title"]))
        story.append(Spacer(1, 4))
        story.append(_build_foreign_patents_table(styles, foreign_patents))
        story.append(Spacer(1, 18))

    cert_blocks = _build_certification_block(
        styles,
        sb08_data.get("prosecution_stage", "before_first_action"),
        sb08_data.get("attorney", {}).get("name", "Attorney Name"),
        sb08_data.get("attorney", {}).get("reg_number", "00000"),
    )
    story.append(KeepTogether(cert_blocks))

    story.append(Spacer(1, 14))
    footnote_text = (
        "<super>1</super> Applicant is to place a check mark here if English translation is attached. &nbsp;&nbsp;"
        "<super>2</super> See Kind Codes of USPTO Patent Documents at www.uspto.gov. &nbsp;&nbsp;"
        "<super>3</super> Enter office that issued the document by the two-letter country code. &nbsp;&nbsp;"
        "<super>4</super> Kind of document by the WIPO Standard ST.16. &nbsp;&nbsp;"
        "<super>5</super> Applicant is to place a check mark here if English language translation is attached."
    )
    story.append(Paragraph(footnote_text, styles["omb"]))

    doc.build(story, onFirstPage=_draw_footer, onLaterPages=_draw_footer)

    return buffer.getvalue()
