import io
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

_FONT_FAMILY_REGISTERED = False
_BASE_FONT = 'Helvetica'
_BOLD_FONT = 'Helvetica-Bold'


def _init_pdf_fonts() -> tuple[str, str]:
    global _FONT_FAMILY_REGISTERED, _BASE_FONT, _BOLD_FONT
    if _FONT_FAMILY_REGISTERED:
        return _BASE_FONT, _BOLD_FONT

    font_dir = Path(__file__).resolve().parents[2] / "assets" / "fonts"
    regular_path = font_dir / "NotoSansDevanagari-Regular.ttf"
    bold_path = font_dir / "NotoSansDevanagari-Bold.ttf"

    if regular_path.exists() and bold_path.exists():
        try:
            pdfmetrics.registerFont(TTFont('NotoSansDevanagari', str(regular_path)))
            pdfmetrics.registerFont(TTFont('NotoSansDevanagari-Bold', str(bold_path)))
            pdfmetrics.registerFontFamily(
                'NotoSansDevanagari',
                normal='NotoSansDevanagari',
                bold='NotoSansDevanagari-Bold',
                italic='NotoSansDevanagari',
                boldItalic='NotoSansDevanagari-Bold'
            )
            _BASE_FONT = 'NotoSansDevanagari'
            _BOLD_FONT = 'NotoSansDevanagari-Bold'
            _FONT_FAMILY_REGISTERED = True
            return _BASE_FONT, _BOLD_FONT
        except Exception:
            _BASE_FONT = 'Helvetica'
            _BOLD_FONT = 'Helvetica-Bold'

    return 'Helvetica', 'Helvetica-Bold'


def generate_pdf_report(analysis_data: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    base_font, bold_font = _init_pdf_fonts()

    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    title_style.fontName = bold_font
    title_style.textColor = colors.HexColor('#0f766e')
    title_style.leading = 22
    title_style.shaping = 1

    h2_style = styles['Heading2']
    h2_style.fontName = bold_font
    h2_style.textColor = colors.HexColor('#1f2937')
    h2_style.leading = 18
    h2_style.shaping = 1

    normal_style = styles['Normal']
    normal_style.fontName = base_font
    normal_style.leading = 14
    normal_style.shaping = 1

    elements = []

    # Title
    elements.append(Paragraph("ManakSetu Technical Procurement Report", title_style))
    elements.append(Spacer(1, 10))

    # Meta Info
    metadata = [
        ["Analysis Title:", Paragraph(analysis_data.get('tender_title', 'Untitled Analysis'), normal_style)],
        ["Generated At:", Paragraph(datetime.now().strftime("%Y-%m-%d %H:%M:%S"), normal_style)],
        ["Overall Status:", Paragraph(analysis_data.get('status', 'Unknown').upper(), normal_style)],
    ]
    meta_table = Table(metadata, colWidths=[100, 400])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), base_font),
        ('FONTNAME', (0,0), (0,-1), bold_font),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#374151')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 20))

    # Executive Summary
    elements.append(Paragraph("Executive Summary", h2_style))
    elements.append(Spacer(1, 5))
    # .get() with a default is not enough: summary is Optional on the model, so
    # the key exists and holds None for a run that produced no summary (a
    # partially_completed analysis, which this route deliberately serves). None
    # reaches Paragraph and raises AttributeError, which surfaced as a 500 on
    # GET /report/pdf rather than as a report saying it has no summary.
    summary_text = analysis_data.get('summary') or 'No summary was produced for this analysis.'
    elements.append(Paragraph(summary_text, normal_style))
    elements.append(Spacer(1, 20))

    # Applicable Standards
    elements.append(Paragraph("Applicable Indian Standards", h2_style))
    elements.append(Spacer(1, 5))

    standards = analysis_data.get('standards', [])
    if standards:
        std_data = [["Standard Code", "Title", "Status"]]
        for s in standards:
            # No default of 'active'. A printed report telling a procurement
            # officer a standard is ACTIVE when the catalogue does not record its
            # status is a claim the system cannot support, and this document may
            # end up in a tender file.
            raw_status = (s.get('status') or '').strip()
            std_data.append([
                Paragraph(str(s.get('designation') or s.get('id', '')), normal_style),
                Paragraph(s.get('title', ''), normal_style),
                Paragraph('Not stated' if raw_status in ('', 'unknown') else raw_status.upper(), normal_style)
            ])
        std_table = Table(std_data, colWidths=[100, 320, 80])
        std_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#ccfbf1')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#115e59')),
            ('FONTNAME', (0,0), (-1,-1), base_font),
            ('FONTNAME', (0,0), (-1,0), bold_font),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(std_table)
    else:
        elements.append(Paragraph("No standards matched.", normal_style))

    elements.append(Spacer(1, 20))

    # Requirements / Findings
    elements.append(Paragraph("Compliance Findings", h2_style))
    elements.append(Spacer(1, 5))

    findings = analysis_data.get('findings', [])
    if findings:
        # Findings key off requirement_id, so the requirement text has to be
        # looked up to make a row traceable. Without it the table said "this
        # verdict, for something" and the reader had no way back to the clause.
        requirements = {
            r.get('id'): r for r in analysis_data.get('requirements', []) or []
        }

        find_data = [["Tender Requirement", "Verdict", "Currentness", "Basis"]]
        for f in findings:
            req = requirements.get(f.get('requirement_id')) or {}
            req_text = (req.get('text') or '').strip() or 'Requirement text unavailable'

            # The old third column was f.get('status', 'Reviewed'). Finding has no
            # status field, so every row printed the literal "Reviewed" — a
            # fabricated column in a document an officer may rely on. The
            # currentness label is the real per-finding verdict on that axis.
            currentness = (f.get('dimensions') or {}).get('currentness') or {}
            label = currentness.get('label') or 'Not assessed'

            find_data.append([
                Paragraph(req_text, normal_style),
                Paragraph(f.get('verdict', '').replace('_', ' ').title(), normal_style),
                Paragraph(str(label).replace('_', ' ').title(), normal_style),
                Paragraph(f.get('reason', ''), normal_style)
            ])
        # splitInRow lets a row taller than a page (a long tender clause in the
        # requirement column) continue on the next page instead of raising
        # LayoutError.
        find_table = Table(find_data, colWidths=[130, 85, 80, 220], splitInRow=1)
        find_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#1f2937')),
            ('FONTNAME', (0,0), (-1,-1), base_font),
            ('FONTNAME', (0,0), (-1,0), bold_font),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(find_table)
    else:
        elements.append(Paragraph("No findings generated.", normal_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
