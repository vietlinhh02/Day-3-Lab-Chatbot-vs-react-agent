import json
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from langchain_core.tools import StructuredTool
except ImportError:  # pragma: no cover - used only before dependencies are installed
    StructuredTool = None


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
EMPLOYEE_PATH = DATA_DIR / "employees.json"
POLICY_PATH = DATA_DIR / "hr_policy.json"
LEAVE_REQUEST_PATH = DATA_DIR / "leave_requests.jsonl"


class LocalStructuredTool:
    def __init__(self, name: str, description: str, func):
        self.name = name
        self.description = description
        self.func = func

    def invoke(self, tool_input: dict[str, Any]):
        return self.func(**tool_input)


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")


def _resolve_employee(employee_id: str) -> dict[str, Any] | None:
    data = _load_json(EMPLOYEE_PATH, {"employees": []})
    for employee in data["employees"]:
        if employee["employee_id"] == employee_id or employee.get("alias") == employee_id:
            return employee
    return None


def _load_leave_requests() -> list[dict[str, Any]]:
    if not LEAVE_REQUEST_PATH.exists():
        return []
    items = []
    for line in LEAVE_REQUEST_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip():
            items.append(json.loads(line))
    return items


def _save_leave_requests(items: list[dict[str, Any]]) -> None:
    LEAVE_REQUEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    content = "\n".join(json.dumps(item, ensure_ascii=True) for item in items)
    LEAVE_REQUEST_PATH.write_text(f"{content}\n" if content else "", encoding="utf-8")


def search_hr_policy(query: str, top_k: int = 3) -> dict[str, Any]:
    policies = _load_json(POLICY_PATH, [])
    query_terms = {term.lower() for term in query.replace(",", " ").split() if len(term) > 2}
    scored = []
    for policy in policies:
        text = policy["text"].lower()
        score = sum(1 for term in query_terms if term in text)
        if score:
            scored.append((score, policy))

    if not scored:
        return {
            "error": "NO_RELEVANT_POLICY_FOUND",
            "message": "Khong tim thay chinh sach lien quan trong so tay nhan su.",
        }

    results = [policy for _, policy in sorted(scored, key=lambda item: item[0], reverse=True)[:top_k]]
    return {
        "answer": " ".join(item["text"] for item in results),
        "sources": [
            {
                "document": item["document"],
                "page": item["page"],
                "chunk_id": item["chunk_id"],
            }
            for item in results
        ],
    }


def check_leave_balance(employee_id: str) -> dict[str, Any]:
    employee = _resolve_employee(employee_id)
    if not employee:
        return {"error": "EMPLOYEE_NOT_FOUND", "message": "Khong tim thay nhan vien."}
    return {
        "employee_id": employee["employee_id"],
        "name": employee["full_name"],
        "annual_leave_remaining": employee["annual_leave_remaining"],
        "sick_leave_remaining": employee["sick_leave_remaining"],
        "unpaid_leave_available": True,
        "manager_email": employee.get("manager_email", ""),
    }


def create_leave_request(
    employee_id: str,
    type: str,
    start_date: str,
    end_date: str,
    reason: str,
) -> dict[str, Any]:
    employee = _resolve_employee(employee_id)
    if not employee:
        return {"error": "EMPLOYEE_NOT_FOUND", "message": "Khong tim thay nhan vien."}
    if type not in {"sick_leave", "annual_leave", "unpaid_leave"}:
        return {"error": "INVALID_LEAVE_TYPE", "message": "Loai nghi khong hop le."}

    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
    if end < start:
        return {"error": "INVALID_DATE_RANGE", "message": "Ngay ket thuc truoc ngay bat dau."}

    items = _load_leave_requests()
    request_id = f"LR-{1024 + len(items)}"
    now = datetime.now().isoformat(timespec="seconds")
    item = {
        "request_id": request_id,
        "employee_id": employee["employee_id"],
        "type": type,
        "start_date": start_date,
        "end_date": end_date,
        "reason": reason,
        "status": "submitted",
        "created_at": now,
        "updated_at": now,
        "manager_email": employee.get("manager_email", ""),
    }
    items.append(item)
    _save_leave_requests(items)
    return {
        "request_id": request_id,
        "status": "submitted",
        "employee_id": employee["employee_id"],
        "type": type,
        "start_date": start_date,
        "end_date": end_date,
        "manager_notified": bool(employee.get("manager_email")),
    }


def get_leave_request(request_id: str) -> dict[str, Any]:
    for item in _load_leave_requests():
        if item["request_id"] == request_id:
            return item
    return {"error": "LEAVE_REQUEST_NOT_FOUND", "message": "Khong tim thay don xin nghi."}


def list_leave_requests(employee_id: str, status: str = "all") -> dict[str, Any]:
    employee = _resolve_employee(employee_id)
    resolved_id = employee["employee_id"] if employee else employee_id
    items = [item for item in _load_leave_requests() if item["employee_id"] == resolved_id]
    if status != "all":
        items = [item for item in items if item["status"] == status]
    return {"employee_id": resolved_id, "items": items}


def update_leave_request(request_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    items = _load_leave_requests()
    for item in items:
        if item["request_id"] != request_id:
            continue
        if item["status"] in {"approved", "rejected", "cancelled"}:
            return {"error": "INVALID_STATUS", "message": "Don nay khong con duoc sua."}
        item.update({key: value for key, value in patch.items() if value is not None})
        item["updated_at"] = datetime.now().isoformat(timespec="seconds")
        _save_leave_requests(items)
        return {"request_id": request_id, "status": item["status"], "updated_fields": list(patch)}
    return {"error": "LEAVE_REQUEST_NOT_FOUND", "message": "Khong tim thay don xin nghi."}


def cancel_leave_request(request_id: str, reason: str) -> dict[str, Any]:
    items = _load_leave_requests()
    for item in items:
        if item["request_id"] != request_id:
            continue
        if item["status"] in {"approved", "rejected", "cancelled"}:
            return {"error": "INVALID_STATUS", "message": "Don nay khong the huy."}
        item["status"] = "cancelled"
        item["cancel_reason"] = reason
        item["updated_at"] = datetime.now().isoformat(timespec="seconds")
        _save_leave_requests(items)
        return {"request_id": request_id, "status": "cancelled"}
    return {"error": "LEAVE_REQUEST_NOT_FOUND", "message": "Khong tim thay don xin nghi."}


def search_employees(
    query: str = "",
    department: str = "",
    role: str = "",
    status: str = "all",
) -> dict[str, Any]:
    employees = _load_json(EMPLOYEE_PATH, {"employees": []})["employees"]
    result = []
    for employee in employees:
        haystack = " ".join(
            [
                employee["employee_id"],
                employee.get("full_name", ""),
                employee.get("email", ""),
                employee.get("department", ""),
            ]
        ).lower()
        if query and query.lower() not in haystack:
            continue
        if department and employee.get("department") != department:
            continue
        if role and employee.get("role") != role:
            continue
        if status != "all" and employee.get("employment_status") != status:
            continue
        result.append(employee)
    return {"items": result}


def get_employee(employee_id: str) -> dict[str, Any]:
    employee = _resolve_employee(employee_id)
    if not employee:
        return {"error": "EMPLOYEE_NOT_FOUND", "message": "Khong tim thay nhan vien."}
    return employee


def create_employee(
    full_name: str,
    email: str,
    role: str,
    department: str,
    position: str,
    manager_id: str,
    annual_leave_remaining: int = 12,
    sick_leave_remaining: int = 5,
) -> dict[str, Any]:
    data = _load_json(EMPLOYEE_PATH, {"employees": []})
    if any(employee["email"] == email for employee in data["employees"]):
        return {"error": "EMAIL_ALREADY_EXISTS", "message": "Email da ton tai."}
    if manager_id and not _resolve_employee(manager_id):
        return {"error": "INVALID_MANAGER", "message": "Manager khong hop le."}

    employee_id = f"E{len(data['employees']) + 1:03d}"
    now = datetime.now().isoformat(timespec="seconds")
    employee = {
        "employee_id": employee_id,
        "alias": "",
        "full_name": full_name,
        "email": email,
        "role": role,
        "department": department,
        "position": position,
        "manager_id": manager_id,
        "manager_email": "",
        "employment_status": "active",
        "annual_leave_remaining": annual_leave_remaining,
        "sick_leave_remaining": sick_leave_remaining,
        "created_at": now,
        "updated_at": now,
    }
    data["employees"].append(employee)
    _write_json(EMPLOYEE_PATH, data)
    return {"employee_id": employee_id, "status": "active"}


def update_employee(employee_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    data = _load_json(EMPLOYEE_PATH, {"employees": []})
    for employee in data["employees"]:
        if employee["employee_id"] != employee_id:
            continue
        employee.update({key: value for key, value in patch.items() if value is not None})
        employee["updated_at"] = datetime.now().isoformat(timespec="seconds")
        _write_json(EMPLOYEE_PATH, data)
        return {"employee_id": employee_id, "updated_fields": list(patch)}
    return {"error": "EMPLOYEE_NOT_FOUND", "message": "Khong tim thay nhan vien."}


def deactivate_employee(employee_id: str, reason: str) -> dict[str, Any]:
    return update_employee(employee_id, {"employment_status": "inactive", "status_reason": reason})


def activate_employee(employee_id: str, reason: str) -> dict[str, Any]:
    return update_employee(employee_id, {"employment_status": "active", "status_reason": reason})


def update_leave_balance(
    employee_id: str,
    annual_leave_remaining: int,
    sick_leave_remaining: int,
    reason: str,
) -> dict[str, Any]:
    if annual_leave_remaining < 0 or sick_leave_remaining < 0:
        return {"error": "INVALID_LEAVE_BALANCE", "message": "So ngay phep khong hop le."}
    result = update_employee(
        employee_id,
        {
            "annual_leave_remaining": annual_leave_remaining,
            "sick_leave_remaining": sick_leave_remaining,
            "leave_balance_reason": reason,
        },
    )
    if "error" in result:
        return result
    return {
        "employee_id": employee_id,
        "annual_leave_remaining": annual_leave_remaining,
        "sick_leave_remaining": sick_leave_remaining,
    }


def _tool(name: str, description: str, func):
    if StructuredTool is None:
        return LocalStructuredTool(name=name, description=description, func=func)
    return StructuredTool.from_function(func=func, name=name, description=description)


def get_hr_tools():
    return [
        _tool("Search_HR_Policy", "Tra cuu chinh sach nhan su tu so tay cong ty.", search_hr_policy),
        _tool("Check_Leave_Balance", "Doc so ngay phep con lai cua nhan vien.", check_leave_balance),
        _tool("Create_Leave_Request", "Tao don xin nghi sau khi user da xac nhan.", create_leave_request),
        _tool("Get_Leave_Request", "Xem chi tiet mot don xin nghi.", get_leave_request),
        _tool("List_Leave_Requests", "Liet ke don xin nghi cua nhan vien.", list_leave_requests),
        _tool("Update_Leave_Request", "Cap nhat don xin nghi sau khi user da xac nhan.", update_leave_request),
        _tool("Cancel_Leave_Request", "Huy don xin nghi sau khi user da xac nhan.", cancel_leave_request),
        _tool("Create_Employee", "Tao ho so nhan vien moi, chi hr_admin va can xac nhan.", create_employee),
        _tool("Get_Employee", "Xem ho so nhan vien.", get_employee),
        _tool("Search_Employees", "Tim kiem nhan vien theo query, phong ban, role hoac trang thai.", search_employees),
        _tool("Update_Employee", "Cap nhat ho so nhan vien, chi hr_admin va can xac nhan.", update_employee),
        _tool("Deactivate_Employee", "Khoa hoac vo hieu hoa nhan vien, chi hr_admin va can xac nhan.", deactivate_employee),
        _tool("Activate_Employee", "Kich hoat lai nhan vien, chi hr_admin va can xac nhan.", activate_employee),
        _tool("Update_Leave_Balance", "Cap nhat so ngay phep, chi hr_admin va can xac nhan.", update_leave_balance),
    ]
