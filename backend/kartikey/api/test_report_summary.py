"""
Executive summary for the PDF report.

Gemini may only rephrase results the pipeline already produced. These tests pin
the grounding (what it is given), the guard (what it may not introduce), and the
fallback (the PDF is produced whatever Gemini does).
"""

import asyncio
import io
import time

import pymupdf
import pytest

from kartikey.api import report_summary
from kartikey.api.report_summary import (
    SUMMARY_FALLBACK,
    build_summary_facts,
    build_summary_prompt,
    generate_executive_summary,
    validate_summary,
)
from shared.utils import AnalysisError


_LUMINAIRES = {"id": "s-10322", "designation": "IS 10322 : Part 5 : Sec 3:2012", "title": "Luminaires", "status": "active"}
_IP_CODES = {"id": "s-60529", "designation": "IS/IEC 60529:2001", "title": "Degrees of protection", "status": "active"}
_CITED_ONLY = {"id": "s-16107", "designation": "IS 16107 : Part 1:2012", "title": "Luminaire performance", "status": "active"}
_SUCCESSOR_ONLY = {"id": "s-302", "designation": "IS 302 : Part 2 : Sec 40:2025", "title": "Appliance safety", "status": "active"}


def _analysis_data() -> dict:
    return {
        "tender_title": "LED street lighting",
        "product_profile": {"product": "LED luminaire", "category": "Not stated"},
        "requirements": [
            {"id": "r1", "text": "Luminaires shall conform to IS 10322 Part 5 Sec 3."},
            {"id": "r2", "text": "Ingress protection IP66."},
        ],
        "findings": [
            {"requirement_id": "r1", "verdict": "justified", "reason": "Matches IS 10322.",
             "requires_human_verification": False,
             "applicable_standards": [_LUMINAIRES],
             "cited_standards": []},
            {"requirement_id": "r2", "verdict": "ambiguous", "reason": "IP rating stated without test method.",
             "requires_human_verification": True,
             "applicable_standards": [_IP_CODES, _LUMINAIRES],
             "cited_standards": [_CITED_ONLY]},
        ],
        # The API's broader list, including an entry no finding treats as applicable.
        "standards": [_LUMINAIRES, _IP_CODES, _SUCCESSOR_ONLY],
        "qco_findings": [
            {"is_number": "IS 10322", "notification_title": "LED Luminaires QCO",
             "certification_scheme": "Scheme-I", "is_mandatory": True},
        ],
    }


# ---------------------------------------------------------------------------
# Grounding
# ---------------------------------------------------------------------------

def test_facts_carry_only_existing_results():
    facts = build_summary_facts(_analysis_data())
    assert facts["requirements_analysed"] == 2
    assert facts["verdict_counts"] == {"justified": 1, "ambiguous": 1}
    assert [s["designation"] for s in facts["applicable_standards"]] == [
        "IS 10322 : Part 5 : Sec 3:2012", "IS/IEC 60529:2001",
    ]
    assert facts["applicable_standards_count"] == 2
    assert "standards" not in facts
    # Only non-justified findings are issues.
    assert [i["verdict"] for i in facts["issues"]] == ["ambiguous"]
    assert facts["human_review_items"] == 1
    assert facts["certification_orders"][0]["order"] == "LED Luminaires QCO"
    # "Not stated" placeholders are not presented as context.
    assert facts["procurement_context"] == {"product": "LED luminaire"}


# ---------------------------------------------------------------------------
# Guard
# ---------------------------------------------------------------------------

GOOD = ("The tender for LED luminaires was checked against IS 10322 and IS/IEC 60529. "
        "One requirement on ingress protection is ambiguous and needs officer review.")


def test_valid_summary_is_accepted():
    facts = build_summary_facts(_analysis_data())
    assert validate_summary({"summary": GOOD}, facts) == GOOD


def test_summary_naming_a_standard_outside_the_analysis_is_rejected():
    facts = build_summary_facts(_analysis_data())
    bad = GOOD + " Compliance with IS 15885 is also required."
    assert validate_summary({"summary": bad}, facts) is None


def test_iec_number_outside_the_analysis_is_rejected():
    facts = build_summary_facts(_analysis_data())
    assert validate_summary({"summary": GOOD + " See IEC 62031 as well."}, facts) is None


def test_ordinary_lowercase_is_is_not_mistaken_for_a_standard():
    facts = build_summary_facts(_analysis_data())
    text = GOOD + " The bid validity is 90 days."
    assert validate_summary({"summary": text}, facts) == text


@pytest.mark.parametrize("result", [
    None, "a plain string", ["list"], {}, {"summary": 42}, {"summary": "too short"},
    {"summary": "x" * 5000},
])
def test_malformed_output_is_rejected(result):
    facts = build_summary_facts(_analysis_data())
    assert validate_summary(result, facts) is None


# ---------------------------------------------------------------------------
# Applicable standards are labelled explicitly
# ---------------------------------------------------------------------------

def test_applicable_standards_come_only_from_findings_applicable_lists():
    facts = build_summary_facts(_analysis_data())
    designations = [s["designation"] for s in facts["applicable_standards"]]
    # First-seen order, de-duplicated (IS 10322 appears on both findings).
    assert designations == ["IS 10322 : Part 5 : Sec 3:2012", "IS/IEC 60529:2001"]


def test_cited_only_standard_is_not_presented_as_applicable():
    facts = build_summary_facts(_analysis_data())
    applicable = {s["designation"] for s in facts["applicable_standards"]}
    assert "IS 16107 : Part 1:2012" not in applicable
    assert [s["designation"] for s in facts["cited_not_applicable_standards"]] == ["IS 16107 : Part 1:2012"]


def test_standard_only_in_the_broader_list_is_not_applicable():
    facts = build_summary_facts(_analysis_data())
    everything = [s["designation"] for s in facts["applicable_standards"] + facts["cited_not_applicable_standards"]]
    assert "IS 302 : Part 2 : Sec 40:2025" not in everything


def test_standard_both_applicable_and_cited_is_listed_once_as_applicable():
    data = _analysis_data()
    data["findings"][0]["cited_standards"] = [_IP_CODES]
    facts = build_summary_facts(data)
    assert "IS/IEC 60529:2001" in [s["designation"] for s in facts["applicable_standards"]]
    assert "IS/IEC 60529:2001" not in [s["designation"] for s in facts["cited_not_applicable_standards"]]


def test_empty_applicable_standards():
    data = _analysis_data()
    for f in data["findings"]:
        f["applicable_standards"] = []
    facts = build_summary_facts(data)
    assert facts["applicable_standards"] == []
    assert facts["applicable_standards_count"] == 0
    prompt = build_summary_prompt(facts)
    assert "If applicable_standards is empty, say that no applicable standards were identified" in prompt


def test_prompt_uses_applicable_field_and_short_paragraphs_not_line_breaks():
    prompt = build_summary_prompt(build_summary_facts(_analysis_data()))
    assert "as five short paragraphs" in prompt
    assert "line break" not in prompt.lower()
    assert "one per line" not in prompt.lower()
    assert "applicable_standards field only" in prompt
    assert "do not name a primary standard" in prompt
    assert '"applicable_standards"' in prompt  # the labelled field is in the facts sent


def test_guard_accepts_cited_standard_mentioned_as_an_issue():
    facts = build_summary_facts(_analysis_data())
    text = GOOD + " The tender also cites IS 16107, which the analysis found not applicable."
    assert validate_summary({"summary": text}, facts) == text


# ---------------------------------------------------------------------------
# Generation and fallback
# ---------------------------------------------------------------------------

class _FakeClient:
    def __init__(self, result=None, delay=0.0, exc=None):
        self.result, self.delay, self.exc, self.calls = result, delay, exc, 0

    def generate_json(self, **kwargs):
        self.calls += 1
        if self.delay:
            time.sleep(self.delay)
        if self.exc:
            raise self.exc
        return self.result


def _patch_client(monkeypatch, client):
    import kartikey.analysis.llm_client as llm
    monkeypatch.setattr(llm, "get_llm_client", lambda: client)


def test_generation_returns_validated_summary(monkeypatch):
    _patch_client(monkeypatch, _FakeClient(result={"summary": GOOD}))
    assert asyncio.run(generate_executive_summary(_analysis_data())) == GOOD


def test_missing_api_key_falls_back(monkeypatch):
    import kartikey.analysis.llm_client as llm

    def _raise():
        raise AnalysisError("GOOGLE_API_KEY is not set.", code="LLM_NOT_CONFIGURED")

    monkeypatch.setattr(llm, "get_llm_client", _raise)
    assert asyncio.run(generate_executive_summary(_analysis_data())) is None


def test_quota_exhausted_falls_back(monkeypatch):
    _patch_client(monkeypatch, _FakeClient(exc=AnalysisError("quota", code="LLM_QUOTA_EXHAUSTED")))
    assert asyncio.run(generate_executive_summary(_analysis_data())) is None


def test_timeout_falls_back(monkeypatch):
    monkeypatch.setattr(report_summary, "SUMMARY_TIMEOUT_SECONDS", 0.2)
    _patch_client(monkeypatch, _FakeClient(result={"summary": GOOD}, delay=1.0))
    assert asyncio.run(generate_executive_summary(_analysis_data())) is None


def test_guard_failure_falls_back(monkeypatch):
    _patch_client(monkeypatch, _FakeClient(result={"summary": GOOD + " Also IS 99999."}))
    assert asyncio.run(generate_executive_summary(_analysis_data())) is None


# ---------------------------------------------------------------------------
# PDF route: summary generated once, saved, reused; PDF always produced
# ---------------------------------------------------------------------------

@pytest.fixture
def stored_analysis(tmp_path, monkeypatch):
    from kartikey.api.routes import analyses as analyses_routes
    from kartikey.api.routes import reports as reports_routes
    from kartikey.persistence.analysis_repository import AnalysisRepository
    from shared.models import (
        Analysis, AnalysisStatus, Finding, InputType, Requirement, Standard, StandardStatus, Verdict,
    )

    repo = AnalysisRepository(str(tmp_path / "analyses.db"))
    asyncio.run(repo.initialize())
    monkeypatch.setattr(analyses_routes, "repository", repo)
    monkeypatch.setattr(reports_routes, "repository", repo)

    analysis = Analysis(input_type=InputType.TEXT, raw_text="tender", tender_title="LED street lighting",
                        status=AnalysisStatus.COMPLETED)
    req = Requirement(analysis_id=analysis.id, text="Luminaires shall conform to IS 10322.")
    std = Standard(is_number="IS 10322", year=2012, title="Luminaires", status=StandardStatus.ACTIVE)
    analysis.requirements = [req]
    analysis.findings = [Finding(requirement_id=req.id, analysis_id=analysis.id, verdict=Verdict.JUSTIFIED,
                                 reason="Matches IS 10322.", applicable_standards=[std], confidence=0.9)]
    asyncio.run(repo.save(analysis))
    return repo, analysis.id


def _pdf_text(response) -> str:
    doc = pymupdf.open(stream=io.BytesIO(response.body), filetype="pdf")
    return " ".join(" ".join(p.get_text().split()) for p in doc)


def test_pdf_uses_generated_summary_and_saves_it_for_reuse(stored_analysis, monkeypatch):
    from kartikey.api.routes.reports import get_pdf_report

    repo, analysis_id = stored_analysis
    summary = "The LED street lighting tender was analysed against IS 10322; its single requirement is justified."
    client = _FakeClient(result={"summary": summary})
    _patch_client(monkeypatch, client)

    first = asyncio.run(get_pdf_report(analysis_id))
    assert summary in _pdf_text(first)
    assert asyncio.run(repo.get(analysis_id)).summary == summary

    second = asyncio.run(get_pdf_report(analysis_id))
    assert summary in _pdf_text(second)
    assert client.calls == 1  # reused, not regenerated


def test_pdf_is_produced_with_fallback_when_gemini_is_unavailable(stored_analysis, monkeypatch):
    from kartikey.api.routes.reports import get_pdf_report

    repo, analysis_id = stored_analysis
    _patch_client(monkeypatch, _FakeClient(exc=AnalysisError("no key", code="LLM_NOT_CONFIGURED")))

    response = asyncio.run(get_pdf_report(analysis_id))
    assert response.media_type == "application/pdf"
    assert response.body.startswith(b"%PDF-")
    assert SUMMARY_FALLBACK in _pdf_text(response)
    assert asyncio.run(repo.get(analysis_id)).summary is None  # nothing saved on failure
