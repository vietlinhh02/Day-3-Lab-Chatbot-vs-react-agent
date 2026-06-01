from datetime import date

from app.tools import leave_request_tools as tools


def test_check_leave_balance():
    result = tools.check_leave_balance("current_user")

    assert result["ok"] is True
    assert result["employee_id"] == "E001"
    assert result["annual_leave_remaining"] == 4
    assert result["sick_leave_remaining"] == 5


def test_calculate_leave_days_excludes_weekends():
    result = tools.calculate_leave_days("current_user", date(2026, 6, 8), date(2026, 6, 14))

    assert result["ok"] is True
    assert result["total_calendar_days"] == 7
    assert result["working_days"] == 5
    assert result["weekend_days"] == 2


def test_create_requires_confirmation(tmp_path, monkeypatch):
    monkeypatch.setattr(tools, "LEAVE_REQUEST_LOG_PATH", tmp_path / "leave_requests.jsonl")

    result = tools.create_leave_request(
        employee_id="current_user",
        type="sick_leave",
        start_date=date(2026, 6, 8),
        end_date=date(2026, 6, 9),
        reason="Sick",
    )

    assert result["ok"] is False
    assert result["error_code"] == "CONFIRMATION_REQUIRED"


def test_create_get_update_cancel_leave_request(tmp_path, monkeypatch):
    monkeypatch.setattr(tools, "LEAVE_REQUEST_LOG_PATH", tmp_path / "leave_requests.jsonl")

    created = tools.create_leave_request(
        employee_id="current_user",
        type="sick_leave",
        start_date=date(2026, 6, 8),
        end_date=date(2026, 6, 9),
        reason="Sick",
        confirmed=True,
        confirmation_source="test",
    )
    request_id = created["request_id"]

    assert created["ok"] is True
    assert created["status"] == "submitted"

    found = tools.get_leave_request(request_id)
    assert found["ok"] is True
    assert found["item"]["request_id"] == request_id

    listed = tools.list_leave_requests("current_user", "submitted")
    assert listed["ok"] is True
    assert [item["request_id"] for item in listed["items"]] == [request_id]

    updated = tools.update_leave_request(
        request_id=request_id,
        patch=tools.LeaveRequestPatch(end_date=date(2026, 6, 10), reason="Need one more day"),
        confirmed=True,
        confirmation_source="test",
    )
    assert updated["ok"] is True
    assert updated["updated_fields"] == ["end_date", "reason"]

    cancelled = tools.cancel_leave_request(
        request_id=request_id,
        reason="Recovered",
        confirmed=True,
        confirmation_source="test",
    )
    assert cancelled["ok"] is True
    assert cancelled["status"] == "cancelled"


def test_exports_langchain_tools():
    exported = tools.get_leave_request_tools()

    assert [tool.name for tool in exported] == [
        "Check_Leave_Balance",
        "Calculate_Leave_Days",
        "Create_Leave_Request",
        "Get_Leave_Request",
        "List_Leave_Requests",
        "Update_Leave_Request",
        "Cancel_Leave_Request",
    ]
