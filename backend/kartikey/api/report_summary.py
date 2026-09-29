"""
kartikey/api/report_summary.py

Executive summary for the PDF report.

Gemini only rephrases results the analysis pipeline has already produced: the
procurement context, the standards it matched, the findings it flagged, the
certification orders it found and the items it left for human review. It
decides nothing — no standards, rankings, verdicts, certifications or evidence
come from this module — and anything it writes that names an IS/IEC/ISO
standard outside the supplied list is thrown away.

Every failure (no API key, quota, timeout, malformed output, a failed check)
ends in the same place: no summary, and the report prints SUMMARY_FALLBACK.
"""

from __future__ import annotations

import asyncio
import json
import re
from collections import Counter
from typing import Any

from shared.utils import get_logger

logger = get_logger(__name__)

SUMMARY_FALLBACK = "Executive summary unavailable — view the analysis findings below."

# Generous for one call, short enough that a stalled or quota-limited Gemini
# does not hold the PDF download for long.
SUMMARY_TIMEOUT_SECONDS = 12.0

_MAX_STANDARDS = 25
_MAX_ISSUES = 8
_MAX_CERTIFICATIONS = 5
_MIN_SUMMARY_CHARS = 40
_MAX_SUMMARY_CHARS = 1200

# A standard reference in prose: "IS 10322", "IS/IEC 60335", "IEC 60529",
# "ISO 9001". Upper-case only, so ordinary words such as "is 20 days" are not
# mistaken for one.
_STANDARD_REF_RE = re.compile(r"\b(?:IS|IEC|ISO)(?:\s*/\s*(?:IEC|ISO))*\s*[:\-]?\s*(\d{2,6})")

_SYSTEM_PROMPT = (
    "You write the executive summary of an Indian public-procurement standards "
    "report for a procurement officer. Use ONLY the facts in the JSON you are "
    "given; they come from an analysis that has already been completed. You do "
    "not decide anything: do not add, infer, rank or recommend standards, "
    "certifications, clauses, evidence or legal conclusions, and do not decide "
    "which standard applies. Refer to a standard only by a designation that "
    "appears in the facts, and never repeat the same standard. Do not call a "
    "standard primary unless the facts say so, and do not call anything legally "
    "mandatory unless the facts say so. Never write \"the AI recommends\" or "
    "similar. If the facts are thin, say less. Plain text, no markdown."
)


def _clip(text: Any, limit: int) -> str:
    s = " ".join(str(text or "").split())
    return s if len(s) <= limit else s[: limit - 1] + "…"


def _standards_from_findings(findings: list[dict], group: str, exclude: set[str] = frozenset()) -> list[dict]:
    """
    The standards the completed analysis placed in `group` ("applicable_standards"
    or "cited_standards") on its findings, de-duplicated in first-seen order.
    Taken as the analysis recorded them: no ranking, and no applicability decided here.
    """
    out: list[dict] = []
    seen: set[str] = set(exclude)
    for f in findings:
        for s in f.get(group) or []:
            key = s.get("id") or s.get("designation") or s.get("is_number")
            if not key or key in seen:
                continue
            seen.add(key)
            out.append({
                "designation": s.get("designation") or s.get("is_number"),
                "title": _clip(s.get("title"), 160),
                "status": s.get("status"),
            })
    return out


def build_summary_facts(analysis_data: dict) -> dict:
    """The structured results the summary may draw on, and nothing else."""
    requirements = analysis_data.get("requirements") or []
    findings = analysis_data.get("findings") or []
    req_text = {r.get("id"): r.get("text") for r in requirements}

    profile = analysis_data.get("product_profile") or {}
    context = {
        k: profile.get(k)
        for k in ("product", "category", "application", "environment")
        if profile.get(k) and str(profile.get(k)).lower() not in ("not stated", "unknown")
    }

    issues = [
        {
            "verdict": f.get("verdict"),
            "requirement": _clip(req_text.get(f.get("requirement_id")), 200),
            "reason": _clip(f.get("reason"), 300),
        }
        for f in findings
        if f.get("verdict") != "justified"
    ][:_MAX_ISSUES]

    certifications = [
        {
            "is_number": q.get("is_number"),
            "order": _clip(q.get("notification_title"), 160),
            "scheme": q.get("certification_scheme"),
            "mandatory": q.get("is_mandatory"),
        }
        for q in (analysis_data.get("qco_findings") or [])
        if isinstance(q, dict)
    ][:_MAX_CERTIFICATIONS]

    applicable = _standards_from_findings(findings, "applicable_standards")
    applicable_keys = {
        s.get("id") or s.get("designation") or s.get("is_number")
        for f in findings for s in (f.get("applicable_standards") or [])
    }
    cited = _standards_from_findings(findings, "cited_standards", exclude=applicable_keys)

    return {
        "tender_title": analysis_data.get("tender_title"),
        "procurement_context": context,
        "requirements_analysed": len(requirements),
        "verdict_counts": dict(Counter(f.get("verdict") for f in findings if f.get("verdict"))),
        # Only the standards the analysis itself attached to findings as
        # applicable. A standard the tender cites but the analysis found not to
        # apply is kept apart, so it can be discussed as an issue without being
        # presented as applicable.
        "applicable_standards_count": len(applicable),
        "applicable_standards": applicable[:_MAX_STANDARDS],
        "cited_not_applicable_standards": cited[:_MAX_STANDARDS],
        "issues": issues,
        "certification_orders": certifications,
        "human_review_items": sum(1 for f in findings if f.get("requires_human_verification")),
    }


def build_summary_prompt(facts: dict) -> str:
    return (
        "Write a concise, decision-oriented executive summary of this "
        "procurement analysis, organised around the procurement decision. Use "
        "these five parts, in order, as five short paragraphs:\n"
        "1. Procurement conclusion: 1-2 sentences on what the analysis "
        "concluded overall.\n"
        "2. Applicable standards: summarize the standards in the "
        "applicable_standards field only (applicable_standards_count is their "
        "total). Do not rank, prioritize, or choose among them, and do not name a "
        "primary standard. State the total and mention a compact representative "
        "set without implying priority; do not list related, normative or testing "
        "standards. Standards in cited_not_applicable_standards are not applicable "
        "and may be mentioned only as an issue. If applicable_standards is empty, "
        "say that no applicable standards were identified in this analysis.\n"
        "3. Key issues: the most important gaps, incorrect or outdated "
        "references, ambiguities and human-review items, summarised rather than "
        "repeated verbatim.\n"
        "4. Certification / regulatory status: only what the facts state about "
        "certification or QCO orders. If there are none, write exactly: \"No "
        "certification obligations were identified in this analysis.\"\n"
        "5. Procurement action: the practical next step that follows from the "
        "findings, such as confirming the applicable standards, correcting an "
        "outdated or incorrect reference, resolving flagged gaps, or completing "
        "human verification.\n"
        "Prioritise clarity over completeness: this is an executive summary, not "
        "a standards catalogue. Keep the whole summary to about 120-170 words and "
        "never more than 1,100 characters.\n"
        'Reply with valid JSON only: {"summary": "..."}\n\n'
        f"FACTS:\n{json.dumps(facts, ensure_ascii=False)}"
    )


def _referenced_numbers(text: str) -> set[str]:
    return set(_STANDARD_REF_RE.findall(text or ""))


def validate_summary(result: Any, facts: dict) -> str | None:
    """
    The summary text if it is usable, else None.

    Rejects anything that is not {"summary": <plain text of sensible length>},
    and any summary naming an IS/IEC/ISO number that none of the supplied
    standards carries.
    """
    if not isinstance(result, dict):
        return None
    summary = result.get("summary")
    if not isinstance(summary, str):
        return None
    summary = " ".join(summary.split())
    if not (_MIN_SUMMARY_CHARS <= len(summary) <= _MAX_SUMMARY_CHARS):
        return None

    allowed: set[str] = set()
    for s in (facts.get("applicable_standards") or []) + (facts.get("cited_not_applicable_standards") or []):
        allowed |= _referenced_numbers(str(s.get("designation") or ""))
    introduced = _referenced_numbers(summary) - allowed
    if introduced:
        logger.warning(
            "Executive summary rejected: names standard number(s) %s not in the analysis.",
            sorted(introduced),
        )
        return None
    return summary


async def generate_executive_summary(analysis_data: dict) -> str | None:
    """
    Ask Gemini, through the existing backend client, to summarise the analysis.

    Returns the validated summary, or None on any failure. Never raises.
    """
    facts = build_summary_facts(analysis_data)
    if not facts["requirements_analysed"] and not facts["applicable_standards"]:
        return None
    try:
        from kartikey.analysis.llm_client import get_llm_client

        client = get_llm_client()
        result = await asyncio.wait_for(
            asyncio.to_thread(
                client.generate_json,
                prompt=build_summary_prompt(facts),
                system_prompt=_SYSTEM_PROMPT,
                temperature=0.2,
            ),
            timeout=SUMMARY_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.info("Executive summary: Gemini exceeded %.0fs; using fallback.", SUMMARY_TIMEOUT_SECONDS)
        return None
    except Exception as exc:
        # Includes AnalysisError: LLM_NOT_CONFIGURED, LLM_QUOTA_EXHAUSTED,
        # LLM_PARSE_ERROR, LLM_CALL_FAILED.
        logger.info("Executive summary unavailable (%s: %s); using fallback.", type(exc).__name__, exc)
        return None
    return validate_summary(result, facts)
