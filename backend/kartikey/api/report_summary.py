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
    "report. Use ONLY the facts in the JSON you are given; they come from an "
    "analysis that has already been completed. Do not add, infer, rank or "
    "recommend standards, certifications, clauses, evidence or legal "
    "conclusions. Refer to a standard only by a designation that appears in the "
    "facts. If the facts are thin, say less. Plain sentences, no markdown."
)


def _clip(text: Any, limit: int) -> str:
    s = " ".join(str(text or "").split())
    return s if len(s) <= limit else s[: limit - 1] + "…"


def build_summary_facts(analysis_data: dict) -> dict:
    """The structured results the summary may draw on, and nothing else."""
    requirements = analysis_data.get("requirements") or []
    findings = analysis_data.get("findings") or []
    standards = analysis_data.get("standards") or []
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

    return {
        "tender_title": analysis_data.get("tender_title"),
        "procurement_context": context,
        "requirements_analysed": len(requirements),
        "verdict_counts": dict(Counter(f.get("verdict") for f in findings if f.get("verdict"))),
        "standards": [
            {
                "designation": s.get("designation") or s.get("is_number"),
                "title": _clip(s.get("title"), 160),
                "status": s.get("status"),
            }
            for s in standards
        ][:_MAX_STANDARDS],
        "issues": issues,
        "certification_orders": certifications,
        "human_review_items": sum(1 for f in findings if f.get("requires_human_verification")),
    }


def build_summary_prompt(facts: dict) -> str:
    return (
        "Write a 4-6 sentence executive summary (under 130 words) of this "
        "procurement analysis for a procurement officer: what was analysed, "
        "which standards were matched, the main issues, certification "
        "obligations, and how many items need human review.\n"
        'Reply with JSON only: {"summary": "..."}\n\n'
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
    for s in facts.get("standards") or []:
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
    if not facts["requirements_analysed"] and not facts["standards"]:
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
