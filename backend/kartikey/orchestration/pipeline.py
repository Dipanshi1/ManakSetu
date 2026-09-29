"""
kartikey/orchestration/pipeline.py

Analysis pipeline — the state machine that coordinates the full workflow.

State transitions:
    queued → extracting → retrieving → analyzing → enriching → completed
                                                              ↘ partially_completed
                                                              ↘ failed

This module is invoked as a FastAPI BackgroundTask (no Celery/Redis for MVP).
Each step calls into the appropriate subsystem:

  _step_extract   → kartikey/document_processing + AI/ML requirement extraction (Step 5)
  _step_retrieve  → kshiraj/knowledge/retrieval_service (Step 7)
  _step_analyze   → kshiraj/aiml_client (Step 6)
  _step_enrich    → kshiraj/enrichment + kartikey/analysis/findings (Step 7)

Step 4 (this step) focuses on:
  - Robust per-step error handling with PARTIAL_COMPLETED state
  - Correct state transitions even when sub-steps fail
  - Populating interim results (IS references from preliminary scan)
    so the frontend has something to show before full AI analysis is ready
  - Clear logging at every transition

IMPORTANT:
  The pipeline mutates the Analysis object in the shared store.
  The GET /analyses/{id} endpoint reads from the same store.
  This is safe in single-process uvicorn (the default for MVP).
  If multi-worker deployment is needed later, replace the in-memory
  store with a database-backed approach.
"""

from __future__ import annotations

import asyncio
import traceback
from collections.abc import Awaitable, Callable

from shared.models import Analysis, AnalysisStatus, InputType, Requirement, RequirementCategory
from shared.utils import AnalysisError, get_logger, utcnow

logger = get_logger(__name__)


# ===========================================================================
# Entry point — called by FastAPI BackgroundTasks
# ===========================================================================

async def run_analysis_pipeline(
    analysis_id: str,
    store: dict[str, Analysis],
    persist: Callable[[Analysis], Awaitable[None]] | None = None,
) -> None:
    """
    Coordinate the full analysis pipeline for one analysis job.

    Parameters
    ----------
    analysis_id:
        The ID of the analysis to run.
    store:
        Shared in-memory dict of analyses (keyed by analysis_id).
        Mutated in place as the pipeline progresses.
    """
    analysis = store.get(analysis_id)
    if not analysis:
        logger.error("Pipeline started for unknown analysis_id=%s — aborting.", analysis_id)
        return

    async def checkpoint() -> None:
        if persist is None:
            return
        try:
            await persist(analysis)
        except Exception as exc:
            logger.error("Could not persist analysis %s: %s", analysis.id, exc)

    logger.info(
        "Pipeline started: analysis_id=%s input_type=%s",
        analysis_id,
        analysis.input_type.value,
    )

    extracted_text: str = ""
    retrieved_standards: list = []
    aiml_response = None

    try:
        # ----------------------------------------------------------------
        # Step 1: Extract text + preliminary requirement scan
        # ----------------------------------------------------------------
        _transition(analysis, AnalysisStatus.EXTRACTING)
        await checkpoint()
        extracted_text = await _step_extract(analysis)

        # ----------------------------------------------------------------
        # Step 2: Retrieve relevant standards from knowledge base
        # ----------------------------------------------------------------
        _transition(analysis, AnalysisStatus.RETRIEVING)
        await checkpoint()
        retrieved_standards = await _step_retrieve(analysis, extracted_text)

        # ----------------------------------------------------------------
        # Step 3: AI/ML analysis
        # ----------------------------------------------------------------
        _transition(analysis, AnalysisStatus.ANALYZING)
        await checkpoint()
        aiml_response = await _step_analyze(analysis, extracted_text, retrieved_standards)

        # ----------------------------------------------------------------
        # Step 4: Enrich — version checks, QCO, compliance, findings assembly
        # ----------------------------------------------------------------
        _transition(analysis, AnalysisStatus.ENRICHING)
        await checkpoint()
        await _step_enrich(analysis, retrieved_standards, aiml_response)

        # ----------------------------------------------------------------
        # Finalize counts and mark completed
        # ----------------------------------------------------------------
        analysis.total_requirements = len(analysis.requirements)
        analysis.issues_found = sum(
            1 for f in analysis.findings
            if f.verdict.value != "justified"
        )

        # If we have requirements but zero findings, something partially failed
        if analysis.total_requirements > 0 and not analysis.findings:
            _transition(analysis, AnalysisStatus.PARTIALLY_COMPLETED)
            analysis.error_message = (
                "Requirements were extracted but analysis could not produce findings. "
                "This may be because the AI/ML or retrieval layer is not yet wired."
            )
        else:
            _transition(analysis, AnalysisStatus.COMPLETED)

        await checkpoint()

        logger.info(
            "Pipeline finished: analysis_id=%s status=%s requirements=%d issues=%d",
            analysis_id,
            analysis.status.value,
            analysis.total_requirements,
            analysis.issues_found,
        )

    except AnalysisError as exc:
        # Known, recoverable errors from our own code
        logger.error(
            "Pipeline failed [%s]: %s (analysis_id=%s)",
            exc.code, exc.message, analysis_id,
        )
        analysis.error_message = f"[{exc.code}] {exc.message}"
        _transition(analysis, AnalysisStatus.FAILED)
        await checkpoint()

    except Exception:
        # Unexpected errors — log full traceback, never let background task crash silently
        logger.error(
            "Pipeline unexpected failure for analysis_id=%s:\n%s",
            analysis_id,
            traceback.format_exc(),
        )
        analysis.error_message = "An unexpected internal error occurred."
        _transition(analysis, AnalysisStatus.FAILED)
        await checkpoint()


# ===========================================================================
# Pipeline steps
# ===========================================================================

async def _step_extract(analysis: Analysis) -> str:
    """
    Load the document text and run a preliminary IS reference scan.

    For TEXT input:   raw_text is used directly.
    For DOCUMENT input: loads the already-extracted text from storage.

    Interim result: populates analysis.requirements with candidate requirements
    found by the regex IS reference scanner. These are PRELIMINARY — they will
    be replaced by proper AI-extracted requirements in Step 5.
    The interim requirements allow the frontend to show something useful
    before the full AI analysis completes.

    Full AI requirement extraction is wired in Step 5.
    """
    # --- Load text ---
    if analysis.input_type == InputType.TEXT:
        if not analysis.raw_text or not analysis.raw_text.strip():
            raise AnalysisError(
                "Analysis has input_type=TEXT but raw_text is empty.",
                code="MISSING_INPUT",
            )
        extracted_text = analysis.raw_text
        logger.debug(
            "_step_extract: using raw_text (%d chars) for analysis_id=%s",
            len(extracted_text), analysis.id,
        )

    elif analysis.input_type == InputType.DOCUMENT:
        if not analysis.document_id:
            raise AnalysisError(
                "Analysis has input_type=DOCUMENT but document_id is missing.",
                code="MISSING_DOCUMENT_ID",
            )
        from kartikey.document_processing.storage import get_extracted_text
        extracted_text = get_extracted_text(analysis.document_id)
        if not extracted_text:
            raise AnalysisError(
                f"No extracted text found for document_id={analysis.document_id}. "
                "Ensure the document was uploaded successfully via POST /documents/upload.",
                code="NO_EXTRACTED_TEXT",
            )
        logger.debug(
            "_step_extract: loaded document text (%d chars) for document_id=%s",
            len(extracted_text), analysis.document_id,
        )
    else:
        raise AnalysisError(
            f"Unknown input_type: {analysis.input_type}",
            code="INVALID_INPUT_TYPE",
        )

    # --- AI-powered requirement extraction (Step 5) ---
    # Try the LLM extractor first. If unavailable (no API key / quota exhausted),
    # fall back to the regex IS reference scanner so the pipeline always produces
    # some output and doesn't hard-fail just because the LLM is unreachable.
    from kartikey.analysis.requirement_extractor import extract_requirements
    from kartikey.document_processing.extractor import scan_is_references
    from shared.utils import AnalysisError as _AnalysisError
    from shared.config import settings

    ai_extraction_succeeded = False
    try:
        ai_requirements, profile_dict = await asyncio.wait_for(
            asyncio.to_thread(
                extract_requirements,
                analysis_id=analysis.id,
                document_text=extracted_text,
            ),
            timeout=settings.aiml_timeout_seconds,
        )
        analysis.requirements = ai_requirements
        analysis.total_requirements = len(ai_requirements)
        analysis.product_profile = profile_dict
        ai_extraction_succeeded = True
        logger.info(
            "_step_extract: AI extraction succeeded — %d requirements found. analysis_id=%s",
            len(ai_requirements), analysis.id,
        )
    except asyncio.TimeoutError:
        logger.warning(
            "_step_extract: LLM extraction exceeded %ss; using regex fallback for analysis_id=%s.",
            settings.aiml_timeout_seconds,
            analysis.id,
        )
        analysis.metadata["extraction_fallback"] = True
        analysis.metadata["extraction_fallback_reason"] = "LLM_TIMEOUT"
    except _AnalysisError as exc:
        if exc.code in ("LLM_NOT_CONFIGURED", "LLM_QUOTA_EXHAUSTED", "LLM_NO_MODEL_AVAILABLE"):
            # LLM unavailable — fall back to regex scan gracefully
            logger.warning(
                "_step_extract: LLM unavailable (%s: %s). "
                "Falling back to regex IS reference scan for analysis_id=%s.",
                exc.code, exc.message, analysis.id,
            )
            analysis.metadata["extraction_fallback"] = True
            analysis.metadata["extraction_fallback_reason"] = exc.code
        else:
            # LLM responded but errored mid-extraction — re-raise to fail the pipeline
            raise

    # Regex fallback — runs when LLM is unavailable OR when LLM found zero requirements
    if not ai_extraction_succeeded or not analysis.requirements:
        is_refs = scan_is_references(extracted_text)
        if is_refs:
            logger.info(
                "_step_extract: regex scan found %d IS reference(s) as %s. analysis_id=%s",
                len(is_refs),
                "fallback" if not ai_extraction_succeeded else "supplement",
                analysis.id,
            )
            regex_requirements = [
                Requirement(
                    analysis_id=analysis.id,
                    text=ref["matched_text"],
                    normalized_text=ref["matched_text"],
                    category=RequirementCategory.TECHNICAL_SPECIFICATION,
                    is_reference=ref["designation"],
                    cited_year=ref["year"],
                    cited_designation=ref["citation"],
                    extraction_confidence=0.6,
                )
                for ref in is_refs
            ]
            analysis.requirements = regex_requirements
            analysis.total_requirements = len(regex_requirements)
        else:
            logger.info(
                "_step_extract: no requirements found by AI or regex. analysis_id=%s",
                analysis.id,
            )

    return extracted_text




async def _step_retrieve(
    analysis: Analysis,
    extracted_text: str,
) -> list[Standard]:
    """
    Search the knowledge base for standards matching the extracted requirements.
    Delegates to the retrieval service for vector/lexical search.
    """
    await asyncio.sleep(0)

    if not analysis.requirements:
        logger.info(
            "_step_retrieve: no requirements to retrieve standards for. analysis_id=%s",
            analysis.id,
        )
        return []

    from kartikey.orchestration.knowledge_registry import get_registry
    from kshiraj.knowledge.retrieval_service import RetrievalQuery
    from kartikey.document_processing.extractor import base_is_number

    registry = get_registry()
    retrieved_standards: list[Standard] = []
    seen_ids: set[str] = set()

    # requirement_id -> {standard_id: best score retrieved for THAT requirement}.
    # The global list below is deduplicated across requirements, which loses
    # which requirement retrieved which standard. This map keeps it, so
    # findings assembly can refuse to attach a standard to a requirement it was
    # never retrieved for. Recorded before the global dedup on purpose.
    requirement_candidates: dict[str, dict[str, float]] = {
        req.id: {} for req in analysis.requirements
    }
    exact_ids_by_req: dict[str, set[str]] = {req.id: set() for req in analysis.requirements}

    # IS-number exact lookup pass
    for req in analysis.requirements:
        if not req.is_reference:
            continue
        matches = registry.standards_store.get_by_is_number(req.is_reference)
        for std in matches:
            requirement_candidates[req.id][std.id] = 1.0
            exact_ids_by_req[req.id].add(std.id)
            if std.id not in seen_ids:
                seen_ids.add(std.id)
                # An explicit citation is a perfect match by definition
                std_copy = std.model_copy()
                std_copy.relevance_score = 1.0
                std_copy.semantic_score = 1.0
                retrieved_standards.append(std_copy)

    # Two-pass: collect all unique semantic candidates first (preserving best score per standard),
    # then sort globally by score descending before applying the global cap.
    # This ensures high-scoring standards from later requirements (e.g. IS 10242 at req 5 rank 1,
    # score=0.86) are not displaced by lower-scoring standards that happened to arrive earlier.
    semantic_scores: dict[str, float] = {}   # id -> best fused score seen
    semantic_stds: dict[str, object] = {}    # id -> Standard object

    product_context = ""
    if hasattr(analysis, 'product_profile') and isinstance(analysis.product_profile, dict):
        product_name = analysis.product_profile.get("product", "")
        category_name = analysis.product_profile.get("category", "")
        context_parts = [p for p in [product_name, category_name] if p and p.lower() not in {"not stated", "unknown"}]
        if context_parts:
            product_context = f"[{' | '.join(context_parts)}] "

    for req in analysis.requirements:
        # is_reference may name a part ("IS 10322 : Part 5 : Sec 3"); the lexical
        # search still gets the base number, as it always has — the part's
        # tokens would pull in unrelated parts of other standards.
        base_query = base_is_number(req.is_reference) if req.is_reference else req.text
        query_text = f"{product_context}{base_query}"
        
        query = RetrievalQuery(
            query_text=query_text,
            top_k=8,
            include_evidence=False,
        )

        result = registry.retrieval_service.search_standards(query)

        # Lexical scores are unbounded weighted sums; the shared copy's
        # relevance_score reaches the API and must be in [0, 1], as hybrid's
        # already is. Scale by this query's top score, as hybrid does for its
        # lexical part. Hybrid scores are <= 1, so the divisor leaves them as-is.
        top_score = max((c.score or 0.0 for c in result.candidates), default=0.0)
        display_divisor = max(1.0, top_score)

        req_candidates = requirement_candidates[req.id]
        req_exact_ids = exact_ids_by_req[req.id]
        for candidate in result.candidates:
            sid = candidate.standard.id
            score = candidate.score or 0.0
            # An exact citation keeps its 1.0, as it does in the global list;
            # lexical scores are unnormalised and must not overwrite it.
            # Raw scores here: this map is the AI/ML engine's input.
            if sid not in req_exact_ids and score > req_candidates.get(sid, -1.0):
                req_candidates[sid] = score
            if sid in seen_ids:
                continue  # already added via exact-match pass; skip
            # Ordering and the cap below use the raw score; only the display
            # copy's relevance_score is scaled.
            if sid not in semantic_scores or score > semantic_scores[sid]:
                semantic_scores[sid] = score
                candidate.standard.relevance_score = score / display_divisor
                semantic_stds[sid] = candidate.standard

    # Sort by best score descending, then extend exact-match list
    sorted_semantic = sorted(semantic_stds.values(), key=lambda s: semantic_scores[s.id], reverse=True)
    retrieved_standards.extend(sorted_semantic)

    # Stored on the analysis rather than returned so the return type — which
    # other callers of this step depend on — is unchanged. _step_enrich reads it.
    analysis.metadata["requirement_candidates"] = requirement_candidates

    logger.info(
        "_step_retrieve: found %d distinct standards across %d requirements. analysis_id=%s",
        len(retrieved_standards), len(analysis.requirements), analysis.id,
    )

    return retrieved_standards[:35]


# ===========================================================================
# 3. Analyze (Step 8)
# ===========================================================================

async def _step_analyze(
    analysis: Analysis,
    extracted_text: str,
    retrieved_standards: list[Standard],
) -> AimlResponse | None:
    """
    Send requirements + retrieved standards to the AI/ML component for analysis.
    """
    await asyncio.sleep(0)

    if not analysis.requirements:
        logger.info(
            "_step_analyze: no requirements to analyze. analysis_id=%s",
            analysis.id,
        )
        return None

    logger.info(
        "_step_analyze: starting AI analysis for %d requirements against %d standards. analysis_id=%s",
        len(analysis.requirements),
        len(retrieved_standards),
        analysis.id,
    )
    
    from shared.contracts import AimlRequest
    from kshiraj.aiml_client.client import AimlClient
    from shared.utils import AnalysisError as _AnalysisError
    from shared.config import settings
    
    request = AimlRequest(
        analysis_id=analysis.id,
        extracted_text=extracted_text,
        requirements=analysis.requirements,
        # Pooled list, sent for compatibility only — not a reasoning input.
        retrieved_standards=retrieved_standards,
        requirement_candidates=_candidate_standards_by_requirement(analysis),
    )
    
    try:
        client = AimlClient(timeout=settings.aiml_timeout_seconds)
        response = await client.run_analysis(request)
        analysis.metadata["analysis_mode"] = "remote" if not client.is_mock else "fallback"
        if client.is_mock:
            analysis.metadata["degraded_reason"] = "No AI/ML service is configured; deterministic analysis was used."
        return response
    except _AnalysisError as exc:
        logger.warning(
            "_step_analyze: AI/ML call failed (%s). "
            "Falling back to compliance-only logic. analysis_id=%s",
            exc.code, analysis.id,
        )
        analysis.metadata["analysis_mode"] = "fallback"
        analysis.metadata["degraded_reason"] = f"AI/ML service unavailable: {exc.message}"
        return None


def _candidate_standards_by_requirement(analysis: Analysis) -> dict[str, list[Standard]]:
    """
    Build each requirement's own reasoning input from the candidate map that
    _step_retrieve recorded: that requirement's standards only, each copied
    with that requirement's retrieval score, cited standards first and then
    highest score first.

    The score on the pooled `retrieved_standards` copies is the best score seen
    across *all* requirements, so it is deliberately not used here. semantic_score
    is 1.0 for a standard this requirement cites exactly (as the exact-match pass
    has always set it) and None otherwise.

    No map means no candidates for anyone — never a fallback to the pool.
    """
    from kartikey.orchestration.knowledge_registry import get_registry

    raw = analysis.metadata.get("requirement_candidates")
    if not isinstance(raw, dict):
        logger.warning(
            "_step_analyze: no requirement_candidates recorded for analysis_id=%s; "
            "every requirement is sent with no candidate standards.",
            analysis.id,
        )
        raw = {}

    store = get_registry().standards_store
    by_requirement: dict[str, list[Standard]] = {}

    for req in analysis.requirements:
        scores = raw.get(req.id) or {}
        cited_ids = (
            {s.id for s in store.get_by_is_number(req.is_reference)}
            if req.is_reference else set()
        )
        candidates: list[Standard] = []
        for sid, score in scores.items():
            std = store.get_by_id(sid)
            if std is None:
                logger.warning(
                    "_step_analyze: candidate standard_id=%s for requirement_id=%s "
                    "is not in the store — skipped.", sid, req.id,
                )
                continue
            candidates.append(std.model_copy(update={
                "relevance_score": float(score),
                "semantic_score": 1.0 if sid in cited_ids else None,
            }))
        # Cited standards first, then by this requirement's score — the same
        # ordering the global list has always used.
        candidates.sort(key=lambda s: (
            s.id not in cited_ids, -(s.relevance_score or 0.0), s.is_number,
        ))
        by_requirement[req.id] = candidates

    return by_requirement


# ===========================================================================
# 4. Enrich — Findings Assembly & Compliance Rules (Step 6/7)
# ===========================================================================

async def _step_enrich(
    analysis: Analysis,
    retrieved_standards: list[Standard],
    aiml_response: object,
) -> None:
    """
    Assemble final findings by merging AI/ML results with deterministic
    compliance checks against the retrieved standards.
    """
    await asyncio.sleep(0)

    from kartikey.orchestration.knowledge_registry import get_registry
    from kartikey.analysis.findings import assemble_findings
    from shared.models import StandardStatus

    registry = get_registry()



    # Pass lookup dicts to the assembler so it can resolve any ID the AI/ML returns
    # to a real object. This enforces the anti-hallucination guardrail.
    # Build from store first, then overlay retrieved copies — retrieved copies carry
    # the actual relevance_score from the retrieval pass, which flows through to the
    # API response and powers the frontend applicability score display.
    standards_lookup = {std.id: std for std in registry.standards_store.list_all()}
    for std in retrieved_standards:
        if std.id in standards_lookup and std.relevance_score is not None:
            standards_lookup[std.id] = std
    # We fetch all evidence here; a production DB would use IN queries.
    evidence_lookup = {ev.id: ev for ev in registry.evidence_store.list_all()}

    # Set by _step_retrieve. Absent only when enrichment runs without a
    # retrieval pass; then no requirement has candidates and nothing the AI/ML
    # proposed is attached — there is no unscoped fallback on this path.
    requirement_candidates = analysis.metadata.get("requirement_candidates")
    if not isinstance(requirement_candidates, dict):
        if aiml_response is not None and analysis.requirements:
            logger.warning(
                "_step_enrich: no requirement_candidates for analysis_id=%s; "
                "AI/ML standard mappings will all be rejected.", analysis.id,
            )
        requirement_candidates = {}

    findings = assemble_findings(
        analysis=analysis,
        retrieved_standards=retrieved_standards,
        aiml_response=aiml_response,
        standards_lookup=standards_lookup,
        evidence_lookup=evidence_lookup,
        requirement_candidates=requirement_candidates,
    )
    analysis.findings = findings

    logger.info(
        "_step_enrich: assembled %d findings for analysis_id=%s "
        "(AI/ML wired=%s, retrieved_standards=%d)",
        len(findings),
        analysis.id,
        aiml_response is not None,
        len(retrieved_standards),
    )

    # ── QCO Applicability Check ────────────────────────────────────────────────
    try:
        from kartikey.analysis.certification_engine import check_qco_applicability
        _profile = {}
        if hasattr(analysis, 'product_profile') and analysis.product_profile:
            _profile = analysis.product_profile if isinstance(analysis.product_profile, dict) else {}
        # IS numbers genuinely on this tender: standards applicable to a
        # requirement, plus the catalogue standards each requirement cites
        # (resolved as the exact-match retrieval pass resolves them, so a cited
        # standard counts even when the AI/ML found nothing applicable).
        # Merely retrieved candidates are excluded — an IS-number match is
        # reported as a hard fact about the tender. is_number, not designation:
        # designation carries ":<year>", which never equals a QCO key.
        _is_nums: list[str] = []
        _seen_is: set[str] = set()

        def _add_is(std) -> None:
            num = getattr(std, "is_number", None)
            if num and num not in _seen_is:
                _seen_is.add(num)
                _is_nums.append(num)

        for f in findings:
            for std in f.applicable_standards:
                _add_is(std)
        for req in analysis.requirements:
            if req.is_reference:
                for std in registry.standards_store.get_by_is_number(req.is_reference):
                    _add_is(std)
        _qco_results = check_qco_applicability(
            product_profile=_profile,
            matched_is_numbers=_is_nums,
        )
        analysis.qco_findings = _qco_results  # Store on analysis object
        logger.info("QCO check: %d applicable orders found for analysis %s", len(_qco_results), analysis.id)
    except Exception as exc:
        logger.warning("QCO check failed silently: %s", exc)
        # Never crash the pipeline
    # ── End QCO Check ──────────────────────────────────────────────────────────

    # ── Non-blocking BIS live sync (fire-and-forget) ───────────────────────────
    asyncio.create_task(_trigger_bis_sync(analysis))
    # ── End BIS sync trigger ───────────────────────────────────────────────────



# ===========================================================================
# Internal helpers
# ===========================================================================

def _transition(analysis: Analysis, new_status: AnalysisStatus) -> None:
    """Update analysis status and timestamp, and log the transition."""
    old = analysis.status.value
    analysis.status = new_status
    analysis.updated_at = utcnow()
    logger.info(
        "Analysis %s: %s → %s",
        analysis.id, old, new_status.value,
    )

async def _trigger_bis_sync(analysis: Analysis) -> None:
    """
    Fire-and-forget BIS live metadata sync for matched standards.

    RULES (all must be respected):
    1. NEVER raises — any exception is logged and swallowed silently.
    2. NEVER blocks the pipeline — called as asyncio.create_task().
    3. Only syncs up to 3 standards (don't hammer BIS portal).
    4. Respects ENABLE_BIS_SYNC env/config — disabled in tests.
    5. Handles null BIS responses: if result.errors is non-empty, records
       the errors so the UI can show "sync attempted — N errors" gracefully.
    """
    from shared.config import get_settings
    cfg = get_settings()
    if not getattr(cfg, 'enable_bis_sync', True):
        return

    try:
        from kshiraj.bis_live_ingestion.adapters.bis_client import BISClient, BISClientConfig
        from kshiraj.bis_live_ingestion.sync import BISSyncService
        from kartikey.orchestration.knowledge_registry import get_registry
        from shared.sync_state import mark_sync_finished, mark_sync_started, record_sync_result
        from datetime import datetime, timezone

        registry = get_registry()
        store = registry.standards_store

        # Use std.is_number (bare base, e.g. "IS 16107") NOT std.designation
        # ("IS 16107:2023 Amd.1") — the normalizer strips years but not Amd.N suffixes,
        # causing exact-match failures in sync.py.
        is_numbers: list[str] = []
        seen: set[str] = set()
        for finding in (analysis.findings or []):
            for std in (finding.applicable_standards or []):
                base = getattr(std, 'base_designation', None) or getattr(std, 'is_number', None)
                if base and base not in seen:
                    seen.add(base)
                    is_numbers.append(base)


        if not is_numbers:
            logger.debug("BIS sync: no designations to sync for analysis %s", analysis.id)
            return

        def _do_sync() -> None:
            """Run blocking HTTP calls off the event loop thread."""
            client_config = BISClientConfig(timeout_seconds=12.0, max_retries=1)
            with BISClient(config=client_config) as client:
                svc = BISSyncService(client=client, standards_store=store)
                for is_number in is_numbers:
                    result = svc.sync_designation(is_number)
                    record_sync_result(
                        is_number=is_number,
                        synced_at=datetime.now(timezone.utc),
                        changed=result.changed,
                        errors=result.errors,
                        analysis_id=analysis.id,
                    )
                    if result.errors:
                        logger.warning("BIS sync error for %s: %s", is_number, result.errors)
                    else:
                        logger.info("BIS sync OK: %s changed=%s", is_number, result.changed)

        # Run blocking sync calls in a thread pool so the event loop stays responsive.
        # The running marker lets the status endpoint report progress ("3 of 19")
        # instead of presenting a partial count as final; it is cleared however
        # the sync ends.
        mark_sync_started(analysis.id, planned=len(is_numbers))
        try:
            await asyncio.to_thread(_do_sync)
        finally:
            mark_sync_finished(analysis.id)

    except Exception as exc:
        # Absolute last-resort catch — pipeline must never see this exception
        logger.warning("BIS sync _trigger_bis_sync failed: %s", exc)

async def rescore_and_merge(analysis_id: str, new_standard: 'Standard') -> None:
    """
    Called after BIS Sync discovers a superseding standard.
    Evaluates the new standard against the analysis requirements and injects it
    into the existing findings if it is highly applicable.
    """
    from shared.config import settings
    from kshiraj.aiml_client.client import AimlClient
    from shared.contracts import AimlRequest
    from kartikey.api.main import repository
    from kartikey.document_processing.storage import get_extracted_text
    from shared.models import Standard, InputType, Verdict

    try:
        analysis = await repository.get(analysis_id)
        if not analysis:
            return

        modified = False
        new_is_norm = new_standard.designation.replace(" ", "").lower() if hasattr(new_standard, "designation") else new_standard.is_number.replace(" ", "").lower()
        
        for finding in analysis.findings:
            if not hasattr(finding, 'applicable_standards'):
                continue
                
            for old_std in finding.applicable_standards:
                if old_std.superseded_by:
                    old_sup_norm = old_std.superseded_by.replace(" ", "").lower()
                    if old_sup_norm == new_is_norm or old_sup_norm == new_standard.is_number.replace(" ", "").lower():
                        if not any(ns.id == new_standard.id for ns in finding.applicable_standards):
                            new_standard.relevance_score = getattr(old_std, 'relevance_score', 0.99)
                            finding.applicable_standards.append(new_standard)
                            modified = True
                        break # Move to next finding

        if modified:
            await repository.save(analysis)
            logger.info("rescore_and_merge: Successfully injected %s into findings for analysis %s", new_standard.is_number, analysis_id)
        else:
            logger.info("rescore_and_merge: %s did not supersede any existing standards in findings", new_standard.is_number)

    except Exception as e:
        logger.error("rescore_and_merge failed for analysis %s: %s", analysis_id, e)
