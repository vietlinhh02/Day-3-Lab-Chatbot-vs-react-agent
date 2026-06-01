import json
from typing import Any, Literal

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field, field_validator, model_validator

from app.tools.tools import EMPLOYEE_DATA_PATH, ToolError, _now, _tool_result

EmployeeRole = Literal["employee", "manager", "hr_admin"]
EmploymentStatus = Literal["active", "inactive", "terminated", "all"]


class CreateEmployeeInput(BaseModel):
    actor_employee_id: str = Field(description="Current user employee id or alias")
    full_name: str = Field(min_length=1)
    email: str
    role: EmployeeRole = "employee"
    department: str = Field(min_length=1)
    position: str = Field(min_length=1)
    manager_id: str | None = None
    annual_leave_remaining: int = Field(ge=0)
    sick_leave_remaining: int = Field(ge=0)
    confirmed: bool = Field(default=False, description="Must be true after explicit user confirmation")
    confirmation_source: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or "." not in value.rsplit("@", 1)[-1]:
            raise ValueError("email must be a valid email address")
        return value


class GetEmployeeInput(BaseModel):
    actor_employee_id: str = Field(description="Current user employee id or alias")
    employee_id: str


class SearchEmployeesInput(BaseModel):
    actor_employee_id: str = Field(description="Current user employee id or alias")
    query: str = ""
    department: str | None = None
    role: EmployeeRole | None = None
    status: EmploymentStatus = "active"
    limit: int = Field(default=20, ge=1, le=100)


class EmployeePatch(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role: EmployeeRole | None = None
    department: str | None = None
    position: str | None = None
    manager_id: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is not None and ("@" not in value or "." not in value.rsplit("@", 1)[-1]):
            raise ValueError("email must be a valid email address")
        return value


class UpdateEmployeeInput(BaseModel):
    actor_employee_id: str = Field(description="Current user employee id or alias")
    employee_id: str
    patch: EmployeePatch
    confirmed: bool = Field(default=False, description="Must be true after explicit user confirmation")
    confirmation_source: str | None = None

    @model_validator(mode="after")
    def validate_patch(self) -> "UpdateEmployeeInput":
        if not self.patch.model_dump(exclude_none=True):
            raise ValueError("patch must contain at least one field")
        return self


class DeactivateEmployeeInput(BaseModel):
    actor_employee_id: str = Field(description="Current user employee id or alias")
    employee_id: str
    reason: str = Field(min_length=1)
    confirmed: bool = Field(default=False, description="Must be true after explicit user confirmation")
    confirmation_source: str | None = None


class ActivateEmployeeInput(BaseModel):
    actor_employee_id: str = Field(description="Current user employee id or alias")
    employee_id: str
    reason: str = Field(min_length=1)
    confirmed: bool = Field(default=False, description="Must be true after explicit user confirmation")
    confirmation_source: str | None = None


class UpdateLeaveBalanceInput(BaseModel):
    actor_employee_id: str = Field(description="Current user employee id or alias")
    employee_id: str
    annual_leave_remaining: int = Field(ge=0)
    sick_leave_remaining: int = Field(ge=0)
    reason: str = Field(min_length=1)
    confirmed: bool = Field(default=False, description="Must be true after explicit user confirmation")
    confirmation_source: str | None = None


def _load_employee_data() -> dict[str, list[dict[str, Any]]]:
    if not EMPLOYEE_DATA_PATH.exists():
        raise ToolError("EMPLOYEE_DATA_MISSING", f"Missing {EMPLOYEE_DATA_PATH}")
    return json.loads(EMPLOYEE_DATA_PATH.read_text(encoding="utf-8"))


def _write_employee_data(data: dict[str, list[dict[str, Any]]]) -> None:
    EMPLOYEE_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    EMPLOYEE_DATA_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _employees(data: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    return data.setdefault("employees", [])


def _find_employee(employees: list[dict[str, Any]], employee_id: str) -> dict[str, Any]:
    for employee in employees:
        if employee.get("employee_id") == employee_id or employee.get("alias") == employee_id:
            return employee
    raise ToolError("EMPLOYEE_NOT_FOUND", f"Employee not found: {employee_id}")


def _public_employee(employee: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in employee.items() if key != "password"}


def _ensure_confirmed(confirmed: bool) -> None:
    if not confirmed:
        raise ToolError(
            "CONFIRMATION_REQUIRED",
            "This write tool requires explicit user confirmation before execution.",
        )


def _ensure_hr_admin(actor: dict[str, Any]) -> None:
    if actor.get("role") != "hr_admin":
        raise ToolError("FORBIDDEN", "Only hr_admin can perform this action.")


def _can_read_employee(actor: dict[str, Any], target: dict[str, Any]) -> bool:
    if actor.get("role") == "hr_admin":
        return True
    if actor.get("employee_id") == target.get("employee_id"):
        return True
    return actor.get("role") == "manager" and target.get("manager_id") == actor.get("employee_id")


def _ensure_can_read(actor: dict[str, Any], target: dict[str, Any]) -> None:
    if not _can_read_employee(actor, target):
        raise ToolError("FORBIDDEN", "Current user cannot read this employee profile.")


def _ensure_email_available(
    employees: list[dict[str, Any]], email: str, current_employee_id: str | None = None
) -> None:
    normalized = email.lower()
    for employee in employees:
        if employee.get("email", "").lower() == normalized:
            if current_employee_id is None or employee.get("employee_id") != current_employee_id:
                raise ToolError("EMAIL_ALREADY_EXISTS", f"Email already exists: {email}")


def _ensure_valid_manager(employees: list[dict[str, Any]], manager_id: str | None) -> str | None:
    if not manager_id:
        return None
    manager = _find_employee(employees, manager_id)
    if manager.get("role") != "manager" or manager.get("employment_status") != "active":
        raise ToolError("INVALID_MANAGER", "manager_id must reference an active manager.")
    return manager.get("email")


def _next_employee_id(employees: list[dict[str, Any]]) -> str:
    max_id = 0
    for employee in employees:
        employee_id = str(employee.get("employee_id", ""))
        if employee_id.startswith("E") and employee_id[1:].isdigit():
            max_id = max(max_id, int(employee_id[1:]))
    return f"E{max_id + 1:03d}"


def create_employee(
    actor_employee_id: str,
    full_name: str,
    email: str,
    role: EmployeeRole = "employee",
    department: str = "",
    position: str = "",
    manager_id: str | None = None,
    annual_leave_remaining: int = 0,
    sick_leave_remaining: int = 0,
    confirmed: bool = False,
    confirmation_source: str | None = None,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        data = _load_employee_data()
        employees = _employees(data)
        actor = _find_employee(employees, actor_employee_id)
        _ensure_hr_admin(actor)
        _ensure_email_available(employees, email)
        manager_email = _ensure_valid_manager(employees, manager_id)

        timestamp = _now()
        employee = {
            "employee_id": _next_employee_id(employees),
            "alias": None,
            "full_name": full_name,
            "email": email,
            "role": role,
            "department": department,
            "position": position,
            "manager_id": manager_id,
            "manager_email": manager_email,
            "employment_status": "active",
            "annual_leave_remaining": annual_leave_remaining,
            "sick_leave_remaining": sick_leave_remaining,
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        employees.append(employee)
        _write_employee_data(data)
        return {
            "employee_id": employee["employee_id"],
            "employment_status": employee["employment_status"],
            "item": _public_employee(employee),
            "confirmation_source": confirmation_source,
        }

    return _tool_result(
        "Create_Employee",
        {
            "actor_employee_id": actor_employee_id,
            "full_name": full_name,
            "email": email,
            "role": role,
            "department": department,
            "position": position,
            "manager_id": manager_id,
            "annual_leave_remaining": annual_leave_remaining,
            "sick_leave_remaining": sick_leave_remaining,
            "confirmed": confirmed,
        },
        run,
    )


def get_employee(actor_employee_id: str, employee_id: str) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        data = _load_employee_data()
        employees = _employees(data)
        actor = _find_employee(employees, actor_employee_id)
        target = _find_employee(employees, employee_id)
        _ensure_can_read(actor, target)
        return {"item": _public_employee(target)}

    return _tool_result(
        "Get_Employee",
        {"actor_employee_id": actor_employee_id, "employee_id": employee_id},
        run,
    )


def search_employees(
    actor_employee_id: str,
    query: str = "",
    department: str | None = None,
    role: EmployeeRole | None = None,
    status: EmploymentStatus = "active",
    limit: int = 20,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        data = _load_employee_data()
        employees = _employees(data)
        actor = _find_employee(employees, actor_employee_id)
        if actor.get("role") not in {"manager", "hr_admin"}:
            raise ToolError("FORBIDDEN", "Only manager or hr_admin can search employee profiles.")

        normalized_query = query.casefold()
        items = []
        for employee in employees:
            if not _can_read_employee(actor, employee):
                continue
            haystack = " ".join(
                str(employee.get(key, ""))
                for key in ("employee_id", "alias", "full_name", "email", "department", "position")
            ).casefold()
            if normalized_query and normalized_query not in haystack:
                continue
            if department and employee.get("department") != department:
                continue
            if role and employee.get("role") != role:
                continue
            if status != "all" and employee.get("employment_status") != status:
                continue
            items.append(_public_employee(employee))
            if len(items) >= limit:
                break
        return {"items": items}

    return _tool_result(
        "Search_Employees",
        {
            "actor_employee_id": actor_employee_id,
            "query": query,
            "department": department,
            "role": role,
            "status": status,
            "limit": limit,
        },
        run,
    )


def update_employee(
    actor_employee_id: str,
    employee_id: str,
    patch: EmployeePatch,
    confirmed: bool = False,
    confirmation_source: str | None = None,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        data = _load_employee_data()
        employees = _employees(data)
        actor = _find_employee(employees, actor_employee_id)
        _ensure_hr_admin(actor)
        target = _find_employee(employees, employee_id)
        before_state = _public_employee(dict(target))

        patch_data = patch.model_dump(exclude_none=True, mode="json")
        if "email" in patch_data:
            _ensure_email_available(employees, patch_data["email"], target["employee_id"])
        if "manager_id" in patch_data:
            target["manager_email"] = _ensure_valid_manager(employees, patch_data["manager_id"])

        target.update(patch_data)
        target["updated_at"] = _now()
        _write_employee_data(data)
        return {
            "employee_id": target["employee_id"],
            "updated_fields": sorted(patch_data.keys()),
            "before_state": before_state,
            "after_state": _public_employee(target),
            "confirmation_source": confirmation_source,
        }

    return _tool_result(
        "Update_Employee",
        {
            "actor_employee_id": actor_employee_id,
            "employee_id": employee_id,
            "patch": patch.model_dump(exclude_none=True, mode="json"),
            "confirmed": confirmed,
        },
        run,
    )


def deactivate_employee(
    actor_employee_id: str,
    employee_id: str,
    reason: str,
    confirmed: bool = False,
    confirmation_source: str | None = None,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        data = _load_employee_data()
        employees = _employees(data)
        actor = _find_employee(employees, actor_employee_id)
        _ensure_hr_admin(actor)
        target = _find_employee(employees, employee_id)
        before_state = _public_employee(dict(target))
        target["employment_status"] = "inactive"
        target["deactivation_reason"] = reason
        target["updated_at"] = _now()
        _write_employee_data(data)
        return {
            "employee_id": target["employee_id"],
            "employment_status": "inactive",
            "before_state": before_state,
            "after_state": _public_employee(target),
            "confirmation_source": confirmation_source,
        }

    return _tool_result(
        "Deactivate_Employee",
        {
            "actor_employee_id": actor_employee_id,
            "employee_id": employee_id,
            "reason": reason,
            "confirmed": confirmed,
        },
        run,
    )


def activate_employee(
    actor_employee_id: str,
    employee_id: str,
    reason: str,
    confirmed: bool = False,
    confirmation_source: str | None = None,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        data = _load_employee_data()
        employees = _employees(data)
        actor = _find_employee(employees, actor_employee_id)
        _ensure_hr_admin(actor)
        target = _find_employee(employees, employee_id)
        before_state = _public_employee(dict(target))
        target["employment_status"] = "active"
        target["activation_reason"] = reason
        target["updated_at"] = _now()
        _write_employee_data(data)
        return {
            "employee_id": target["employee_id"],
            "employment_status": "active",
            "before_state": before_state,
            "after_state": _public_employee(target),
            "confirmation_source": confirmation_source,
        }

    return _tool_result(
        "Activate_Employee",
        {
            "actor_employee_id": actor_employee_id,
            "employee_id": employee_id,
            "reason": reason,
            "confirmed": confirmed,
        },
        run,
    )


def update_leave_balance(
    actor_employee_id: str,
    employee_id: str,
    annual_leave_remaining: int,
    sick_leave_remaining: int,
    reason: str,
    confirmed: bool = False,
    confirmation_source: str | None = None,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        data = _load_employee_data()
        employees = _employees(data)
        actor = _find_employee(employees, actor_employee_id)
        _ensure_hr_admin(actor)
        target = _find_employee(employees, employee_id)
        before_state = _public_employee(dict(target))
        target["annual_leave_remaining"] = annual_leave_remaining
        target["sick_leave_remaining"] = sick_leave_remaining
        target["leave_balance_update_reason"] = reason
        target["updated_at"] = _now()
        _write_employee_data(data)
        return {
            "employee_id": target["employee_id"],
            "annual_leave_remaining": annual_leave_remaining,
            "sick_leave_remaining": sick_leave_remaining,
            "before_state": before_state,
            "after_state": _public_employee(target),
            "confirmation_source": confirmation_source,
        }

    return _tool_result(
        "Update_Leave_Balance",
        {
            "actor_employee_id": actor_employee_id,
            "employee_id": employee_id,
            "annual_leave_remaining": annual_leave_remaining,
            "sick_leave_remaining": sick_leave_remaining,
            "reason": reason,
            "confirmed": confirmed,
        },
        run,
    )


def get_user_management_tools() -> list[StructuredTool]:
    return [
        StructuredTool.from_function(
            name="Create_Employee",
            description="Create an employee profile. Requires hr_admin and explicit confirmation.",
            func=create_employee,
            args_schema=CreateEmployeeInput,
        ),
        StructuredTool.from_function(
            name="Get_Employee",
            description="Read an employee profile if the current user has access.",
            func=get_employee,
            args_schema=GetEmployeeInput,
        ),
        StructuredTool.from_function(
            name="Search_Employees",
            description="Search employee profiles visible to a manager or hr_admin.",
            func=search_employees,
            args_schema=SearchEmployeesInput,
        ),
        StructuredTool.from_function(
            name="Update_Employee",
            description="Update an employee profile. Requires hr_admin and explicit confirmation.",
            func=update_employee,
            args_schema=UpdateEmployeeInput,
        ),
        StructuredTool.from_function(
            name="Deactivate_Employee",
            description="Deactivate an employee account. Requires hr_admin and explicit confirmation.",
            func=deactivate_employee,
            args_schema=DeactivateEmployeeInput,
        ),
        StructuredTool.from_function(
            name="Activate_Employee",
            description="Activate an employee account. Requires hr_admin and explicit confirmation.",
            func=activate_employee,
            args_schema=ActivateEmployeeInput,
        ),
        StructuredTool.from_function(
            name="Update_Leave_Balance",
            description="Update leave balances. Requires hr_admin and explicit confirmation.",
            func=update_leave_balance,
            args_schema=UpdateLeaveBalanceInput,
        ),
    ]
