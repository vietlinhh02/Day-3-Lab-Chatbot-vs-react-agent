import json
from datetime import date, datetime, timezone
from pathlib import Path
from time import perf_counter
from typing import Any, Literal
from uuid import uuid4

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field, model_validator

from app.telemetry.logger import logger

LeaveType = Literal["sick_leave", "annual_leave", "unpaid_leave"]
LeaveStatus = Literal["draft", "submitted", "approved", "rejected", "cancelled", "all"]

EMPLOYEE_DATA_PATH = Path("frontend/data/employees.json")
LEAVE_REQUEST_LOG_PATH = Path("app/data/leave_requests.jsonl")
WRITABLE_STATUSES = {"draft", "submitted"}


class ToolError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class CheckLeaveBalanceInput(BaseModel):
    employee_id: str = Field(description="Employee id or alias, for example E001/current_user")


class CalculateLeaveDaysInput(BaseModel):
    employee_id: str = Field(description="Employee id or alias used for audit/context")
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_range(self) -> "CalculateLeaveDaysInput":
        if self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date")
        return self


class CreateLeaveRequestInput(BaseModel):
    employee_id: str
    type: LeaveType
    start_date: date
    end_date: date
    reason: str = Field(min_length=1)
    confirmed: bool = Field(default=False, description="Must be true after explicit user confirmation")
    confirmation_source: str | None = Field(default=None)

    @model_validator(mode="after")
    def validate_range(self) -> "CreateLeaveRequestInput":
        if self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date")
        return self


class GetLeaveRequestInput(BaseModel):
    request_id: str


class ListLeaveRequestsInput(BaseModel):
    employee_id: str
    status: LeaveStatus = "all"


class LeaveRequestPatch(BaseModel):
    type: LeaveType | None = None
    start_date: date | None = None
    end_date: date | None = None
    reason: str | None = None


class UpdateLeaveRequestInput(BaseModel):
    request_id: str
    patch: LeaveRequestPatch
    confirmed: bool = Field(default=False, description="Must be true after explicit user confirmation")
    confirmation_source: str | None = Field(default=None)

    @model_validator(mode="after")
    def validate_patch(self) -> "UpdateLeaveRequestInput":
        if not self.patch.model_dump(exclude_none=True):
            raise ValueError("patch must contain at least one field")
        return self


class CancelLeaveRequestInput(BaseModel):
    request_id: str
    reason: str = Field(min_length=1)
    confirmed: bool = Field(default=False, description="Must be true after explicit user confirmation")
    confirmation_source: str | None = Field(default=None)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, date):
        return value.isoformat()
    return value


def _load_employees() -> list[dict[str, Any]]:
    if not EMPLOYEE_DATA_PATH.exists():
        raise ToolError("EMPLOYEE_DATA_MISSING", f"Missing {EMPLOYEE_DATA_PATH}")
    data = json.loads(EMPLOYEE_DATA_PATH.read_text(encoding="utf-8"))
    return data.get("employees", [])


def _find_employee(employee_id: str) -> dict[str, Any]:
    for employee in _load_employees():
        if employee.get("employee_id") == employee_id or employee.get("alias") == employee_id:
            return employee
    raise ToolError("EMPLOYEE_NOT_FOUND", f"Employee not found: {employee_id}")


def _load_requests() -> list[dict[str, Any]]:
    if not LEAVE_REQUEST_LOG_PATH.exists():
        return []

    requests: list[dict[str, Any]] = []
    for line in LEAVE_REQUEST_LOG_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip():
            requests.append(json.loads(line))
    return requests


def _write_requests(requests: list[dict[str, Any]]) -> None:
    LEAVE_REQUEST_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    content = "".join(json.dumps(item, ensure_ascii=False) + "\n" for item in requests)
    LEAVE_REQUEST_LOG_PATH.write_text(content, encoding="utf-8")


def _find_request(request_id: str, requests: list[dict[str, Any]]) -> dict[str, Any]:
    for request in requests:
        if request.get("request_id") == request_id:
            return request
    raise ToolError("REQUEST_NOT_FOUND", f"Leave request not found: {request_id}")


def _next_request_id(requests: list[dict[str, Any]]) -> str:
    max_id = 1023
    for request in requests:
        request_id = str(request.get("request_id", ""))
        if request_id.startswith("LR-") and request_id[3:].isdigit():
            max_id = max(max_id, int(request_id[3:]))
    return f"LR-{max_id + 1}"


def _leave_days(start_date: date, end_date: date) -> dict[str, Any]:
    total_days = (end_date - start_date).days + 1
    dates = [date.fromordinal(start_date.toordinal() + offset) for offset in range(total_days)]
    weekend_dates = [item.isoformat() for item in dates if item.weekday() >= 5]
    working_dates = [item.isoformat() for item in dates if item.weekday() < 5]
    return {
        "total_calendar_days": total_days,
        "working_days": len(working_dates),
        "weekend_days": len(weekend_dates),
        "working_dates": working_dates,
        "weekend_dates": weekend_dates,
    }


def _ensure_confirmed(confirmed: bool) -> None:
    if not confirmed:
        raise ToolError(
            "CONFIRMATION_REQUIRED",
            "This write tool requires explicit user confirmation before execution.",
        )


def _ensure_balance(employee: dict[str, Any], leave_type: str, working_days: int) -> None:
    if leave_type == "annual_leave" and working_days > employee.get("annual_leave_remaining", 0):
        raise ToolError("INSUFFICIENT_LEAVE_BALANCE", "Annual leave balance is insufficient.")
    if leave_type == "sick_leave" and working_days > employee.get("sick_leave_remaining", 0):
        raise ToolError("INSUFFICIENT_LEAVE_BALANCE", "Sick leave balance is insufficient.")


def _tool_result(tool_name: str, args: dict[str, Any], fn) -> dict[str, Any]:
    trace_id = f"trace-{uuid4()}"
    started = perf_counter()
    log_args = _json_safe(args)
    try:
        result = fn()
        logger.log_event(
            "TOOL_CALL",
            {
                "trace_id": trace_id,
                "tool_name": tool_name,
                "arguments": log_args,
                "latency_ms": round((perf_counter() - started) * 1000, 2),
            },
        )
        return {"ok": True, "trace_id": trace_id, **result}
    except ToolError as exc:
        logger.log_event(
            "TOOL_CALL_ERROR",
            {
                "trace_id": trace_id,
                "tool_name": tool_name,
                "arguments": log_args,
                "latency_ms": round((perf_counter() - started) * 1000, 2),
                "error_code": exc.code,
            },
        )
        return {"ok": False, "trace_id": trace_id, "error_code": exc.code, "message": exc.message}


def check_leave_balance(employee_id: str) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        employee = _find_employee(employee_id)
        return {
            "employee_id": employee["employee_id"],
            "name": employee.get("full_name", employee.get("name")),
            "annual_leave_remaining": employee.get("annual_leave_remaining", 0),
            "sick_leave_remaining": employee.get("sick_leave_remaining", 0),
            "unpaid_leave_available": True,
            "manager_email": employee.get("manager_email"),
        }

    return _tool_result("Check_Leave_Balance", {"employee_id": employee_id}, run)


def calculate_leave_days(employee_id: str, start_date: date, end_date: date) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        employee = _find_employee(employee_id)
        return {"employee_id": employee["employee_id"], **_leave_days(start_date, end_date)}

    return _tool_result(
        "Calculate_Leave_Days",
        {
            "employee_id": employee_id,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        run,
    )


def create_leave_request(
    employee_id: str,
    type: LeaveType,
    start_date: date,
    end_date: date,
    reason: str,
    confirmed: bool = False,
    confirmation_source: str | None = None,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        employee = _find_employee(employee_id)
        days = _leave_days(start_date, end_date)
        _ensure_balance(employee, type, days["working_days"])

        requests = _load_requests()
        timestamp = _now()
        request = {
            "request_id": _next_request_id(requests),
            "employee_id": employee["employee_id"],
            "type": type,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "reason": reason,
            "status": "submitted",
            "created_at": timestamp,
            "updated_at": timestamp,
            "manager_email": employee.get("manager_email"),
        }
        requests.append(request)
        _write_requests(requests)
        return {
            **request,
            "manager_notified": False,
            "working_days": days["working_days"],
            "confirmation_source": confirmation_source,
        }

    return _tool_result(
        "Create_Leave_Request",
        {
            "employee_id": employee_id,
            "type": type,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "reason": reason,
            "confirmed": confirmed,
        },
        run,
    )


def get_leave_request(request_id: str) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        request = _find_request(request_id, _load_requests())
        return {"item": request}

    return _tool_result("Get_Leave_Request", {"request_id": request_id}, run)


def list_leave_requests(employee_id: str, status: LeaveStatus = "all") -> dict[str, Any]:
    def run() -> dict[str, Any]:
        employee = _find_employee(employee_id)
        items = [
            request
            for request in _load_requests()
            if request.get("employee_id") == employee["employee_id"]
            and (status == "all" or request.get("status") == status)
        ]
        return {"employee_id": employee["employee_id"], "items": items}

    return _tool_result("List_Leave_Requests", {"employee_id": employee_id, "status": status}, run)


def update_leave_request(
    request_id: str,
    patch: LeaveRequestPatch,
    confirmed: bool = False,
    confirmation_source: str | None = None,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        requests = _load_requests()
        request = _find_request(request_id, requests)
        before_state = dict(request)

        if request.get("status") not in WRITABLE_STATUSES:
            raise ToolError("INVALID_STATUS_TRANSITION", "This leave request can no longer be updated.")

        patch_data = patch.model_dump(exclude_none=True)
        updated = {**request, **{key: str(value) for key, value in patch_data.items()}}
        start = date.fromisoformat(updated["start_date"])
        end = date.fromisoformat(updated["end_date"])
        if end < start:
            raise ToolError("INVALID_DATE_RANGE", "end_date must not be before start_date.")

        employee = _find_employee(updated["employee_id"])
        days = _leave_days(start, end)
        _ensure_balance(employee, updated["type"], days["working_days"])

        request.update(updated)
        request["updated_at"] = _now()
        _write_requests(requests)
        return {
            "request_id": request_id,
            "status": request["status"],
            "updated_fields": sorted(patch_data.keys()),
            "before_state": before_state,
            "after_state": request,
            "confirmation_source": confirmation_source,
        }

    return _tool_result(
        "Update_Leave_Request",
        {
            "request_id": request_id,
            "patch": patch.model_dump(exclude_none=True, mode="json"),
            "confirmed": confirmed,
        },
        run,
    )


def cancel_leave_request(
    request_id: str,
    reason: str,
    confirmed: bool = False,
    confirmation_source: str | None = None,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        requests = _load_requests()
        request = _find_request(request_id, requests)
        before_state = dict(request)

        if request.get("status") not in WRITABLE_STATUSES:
            raise ToolError("INVALID_STATUS_TRANSITION", "This leave request can no longer be cancelled.")

        request["status"] = "cancelled"
        request["cancellation_reason"] = reason
        request["updated_at"] = _now()
        _write_requests(requests)
        return {
            "request_id": request_id,
            "status": "cancelled",
            "before_state": before_state,
            "after_state": request,
            "confirmation_source": confirmation_source,
        }

    return _tool_result(
        "Cancel_Leave_Request",
        {"request_id": request_id, "reason": reason, "confirmed": confirmed},
        run,
    )


def get_leave_request_tools() -> list[StructuredTool]:
    return [
        StructuredTool.from_function(
            name="Check_Leave_Balance",
            description="Read the remaining annual/sick leave balance for an employee.",
            func=check_leave_balance,
            args_schema=CheckLeaveBalanceInput,
        ),
        StructuredTool.from_function(
            name="Calculate_Leave_Days",
            description="Calculate calendar days, working days, and weekend days for a leave range.",
            func=calculate_leave_days,
            args_schema=CalculateLeaveDaysInput,
        ),
        StructuredTool.from_function(
            name="Create_Leave_Request",
            description="Create a submitted leave request after explicit user confirmation.",
            func=create_leave_request,
            args_schema=CreateLeaveRequestInput,
        ),
        StructuredTool.from_function(
            name="Get_Leave_Request",
            description="Read one leave request by request id.",
            func=get_leave_request,
            args_schema=GetLeaveRequestInput,
        ),
        StructuredTool.from_function(
            name="List_Leave_Requests",
            description="List leave requests for an employee, optionally filtered by status.",
            func=list_leave_requests,
            args_schema=ListLeaveRequestsInput,
        ),
        StructuredTool.from_function(
            name="Update_Leave_Request",
            description="Update an editable leave request after explicit user confirmation.",
            func=update_leave_request,
            args_schema=UpdateLeaveRequestInput,
        ),
        StructuredTool.from_function(
            name="Cancel_Leave_Request",
            description="Cancel an editable leave request after explicit user confirmation.",
            func=cancel_leave_request,
            args_schema=CancelLeaveRequestInput,
        ),
    ]
