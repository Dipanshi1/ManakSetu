"""
The BIS sync status reports whether a sync is still running, so the UI can show
"3 of 19" instead of presenting a partial count as the final one.
"""

from datetime import datetime, timezone

import pytest

from shared import sync_state


@pytest.fixture(autouse=True)
def _clean_registry():
    sync_state._sync_registry.clear()
    sync_state._running.clear()
    yield
    sync_state._sync_registry.clear()
    sync_state._running.clear()


def _record(analysis_id: str, is_number: str, errors: list[str] | None = None) -> None:
    sync_state.record_sync_result(
        is_number=is_number,
        synced_at=datetime.now(timezone.utc),
        changed=False,
        errors=errors or [],
        analysis_id=analysis_id,
    )


def test_running_sync_reports_progress_against_planned_total():
    sync_state.mark_sync_started("an-1", planned=19)
    _record("an-1", "IS 1")
    _record("an-1", "IS 2")
    _record("an-1", "IS 3")

    status = sync_state.get_sync_status("an-1")
    assert status["in_progress"] is True
    assert status["planned"] == 19
    assert status["total_synced"] == 3


def test_finished_sync_is_no_longer_in_progress_and_keeps_its_counts():
    sync_state.mark_sync_started("an-1", planned=2)
    _record("an-1", "IS 1")
    _record("an-1", "IS 2", errors=["portal timeout"])
    sync_state.mark_sync_finished("an-1")

    status = sync_state.get_sync_status("an-1")
    assert status["in_progress"] is False
    assert status["planned"] is None
    assert status["total_synced"] == 2
    assert status["error_count"] == 1


def test_running_state_is_scoped_to_its_analysis():
    sync_state.mark_sync_started("an-1", planned=5)
    other = sync_state.get_sync_status("an-2")
    assert other["in_progress"] is False
    assert other["planned"] is None


def test_existing_fields_are_unchanged_when_nothing_ran():
    status = sync_state.get_sync_status("an-unknown")
    assert status == {
        "last_synced_at": None,
        "total_synced": 0,
        "error_count": 0,
        "entries": [],
        "in_progress": False,
        "planned": None,
    }


def test_finishing_an_unknown_sync_is_harmless():
    sync_state.mark_sync_finished("never-started")
    assert sync_state.get_sync_status("never-started")["in_progress"] is False
