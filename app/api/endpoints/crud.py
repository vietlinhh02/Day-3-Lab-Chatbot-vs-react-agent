import json
from datetime import datetime
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path

router = APIRouter()

EMPLOYEE_DATA_PATH = Path("frontend/data/employees.json")
LEAVE_REQUEST_PATH = Path("app/data/leave_requests.jsonl")
TASK_DATA_PATH = Path("app/data/tasks.jsonl")


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    items = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            items.append(json.loads(line))
    return items


def _write_jsonl(path: Path, items: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = "".join(json.dumps(item, ensure_ascii=False) + "\n" for item in items)
    path.write_text(content, encoding="utf-8")


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    employee_id: str
    full_name: str
    email: str
    role: str
    department: str
    position: str


class EmployeeResponse(BaseModel):
    employee_id: str
    full_name: str
    email: str
    role: str
    department: str
    position: str
    manager_id: str | None
    employment_status: str
    annual_leave_remaining: int
    sick_leave_remaining: int


class LeaveRequestResponse(BaseModel):
    request_id: str
    employee_id: str
    type: str
    start_date: str
    end_date: str
    reason: str
    status: str
    created_at: str | None = None


class TaskResponse(BaseModel):
    task_id: str
    title: str
    description: str
    status: str
    priority: str
    assignee_id: str
    creator_id: str
    due_date: str
    tags: str
    created_at: str | None = None


class CreateTaskRequest(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    assignee_id: str
    due_date: str
    tags: list[str] = []


class UpdateTaskRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    assignee_id: str | None = None
    due_date: str | None = None
    tags: list[str] | None = None


class CreateLeaveRequest(BaseModel):
    employee_id: str
    type: str
    start_date: str
    end_date: str
    reason: str


class UpdateLeaveRequest(BaseModel):
    status: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    reason: str | None = None


@router.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest):
    employees = _load_json(EMPLOYEE_DATA_PATH, {"employees": []}).get("employees", [])
    for emp in employees:
        if emp.get("email") == req.email and emp.get("password") == req.password:
            return LoginResponse(
                employee_id=emp["employee_id"],
                full_name=emp["full_name"],
                email=emp["email"],
                role=emp["role"],
                department=emp["department"],
                position=emp["position"],
            )
    raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")


@router.get("/employees", response_model=list[EmployeeResponse])
def list_employees(department: str | None = None, status: str | None = None):
    employees = _load_json(EMPLOYEE_DATA_PATH, {"employees": []}).get("employees", [])
    result = []
    for emp in employees:
        if department and emp.get("department") != department:
            continue
        if status and emp.get("employment_status") != status:
            continue
        result.append(EmployeeResponse(
            employee_id=emp["employee_id"],
            full_name=emp["full_name"],
            email=emp["email"],
            role=emp["role"],
            department=emp["department"],
            position=emp["position"],
            manager_id=emp.get("manager_id"),
            employment_status=emp.get("employment_status", "active"),
            annual_leave_remaining=emp.get("annual_leave_remaining", 0),
            sick_leave_remaining=emp.get("sick_leave_remaining", 0),
        ))
    return result


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: str):
    employees = _load_json(EMPLOYEE_DATA_PATH, {"employees": []}).get("employees", [])
    for emp in employees:
        if emp.get("employee_id") == employee_id or emp.get("alias") == employee_id:
            return EmployeeResponse(
                employee_id=emp["employee_id"],
                full_name=emp["full_name"],
                email=emp["email"],
                role=emp["role"],
                department=emp["department"],
                position=emp["position"],
                manager_id=emp.get("manager_id"),
                employment_status=emp.get("employment_status", "active"),
                annual_leave_remaining=emp.get("annual_leave_remaining", 0),
                sick_leave_remaining=emp.get("sick_leave_remaining", 0),
            )
    raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")


@router.get("/leave-requests", response_model=list[LeaveRequestResponse])
def list_leave_requests(employee_id: str | None = None, status: str | None = None):
    requests = _load_jsonl(LEAVE_REQUEST_PATH)
    result = []
    for req in requests:
        if employee_id and req.get("employee_id") != employee_id:
            continue
        if status and req.get("status") != status:
            continue
        result.append(LeaveRequestResponse(
            request_id=req["request_id"],
            employee_id=req["employee_id"],
            type=req["type"],
            start_date=req["start_date"],
            end_date=req["end_date"],
            reason=req["reason"],
            status=req["status"],
            created_at=req.get("created_at"),
        ))
    return result


@router.post("/leave-requests", response_model=LeaveRequestResponse)
def create_leave_request(req: CreateLeaveRequest):
    requests = _load_jsonl(LEAVE_REQUEST_PATH)
    now = datetime.now().isoformat(timespec="seconds")
    new_id = f"LR-{1024 + len(requests)}"
    leave = {
        "request_id": new_id,
        "employee_id": req.employee_id,
        "type": req.type,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "reason": req.reason,
        "status": "submitted",
        "created_at": now,
        "updated_at": now,
    }
    requests.append(leave)
    _write_jsonl(LEAVE_REQUEST_PATH, requests)
    return LeaveRequestResponse(**leave)


@router.patch("/leave-requests/{request_id}")
def update_leave_request(request_id: str, req: UpdateLeaveRequest):
    requests = _load_jsonl(LEAVE_REQUEST_PATH)
    for leave in requests:
        if leave.get("request_id") == request_id:
            if req.status:
                leave["status"] = req.status
            if req.start_date:
                leave["start_date"] = req.start_date
            if req.end_date:
                leave["end_date"] = req.end_date
            if req.reason:
                leave["reason"] = req.reason
            leave["updated_at"] = datetime.now().isoformat(timespec="seconds")
            _write_jsonl(LEAVE_REQUEST_PATH, requests)
            return {"request_id": request_id, "status": leave["status"]}
    raise HTTPException(status_code=404, detail="Không tìm thấy đơn")


@router.get("/tasks", response_model=list[TaskResponse])
def list_tasks(assignee_id: str | None = None, status: str | None = None):
    tasks = _load_jsonl(TASK_DATA_PATH)
    result = []
    for task in tasks:
        if assignee_id and task.get("assignee_id") != assignee_id:
            continue
        if status and task.get("status") != status:
            continue
        tags = task.get("tags", "")
        if isinstance(tags, list):
            tags = json.dumps(tags, ensure_ascii=False)
        result.append(TaskResponse(
            task_id=task["task_id"],
            title=task["title"],
            description=task.get("description", ""),
            status=task["status"],
            priority=task.get("priority", "medium"),
            assignee_id=task["assignee_id"],
            creator_id=task.get("creator_id", ""),
            due_date=task.get("due_date", ""),
            tags=tags,
            created_at=task.get("created_at"),
        ))
    return result


@router.post("/tasks", response_model=TaskResponse)
def create_task(creator_id: str, req: CreateTaskRequest):
    tasks = _load_jsonl(TASK_DATA_PATH)
    max_id = 0
    for task in tasks:
        task_id = str(task.get("task_id", ""))
        if task_id.startswith("T-") and task_id[2:].isdigit():
            max_id = max(max_id, int(task_id[2:]))
    new_id = f"T-{max_id + 1:03d}"
    now = datetime.now().isoformat(timespec="seconds")
    task = {
        "task_id": new_id,
        "title": req.title,
        "description": req.description,
        "status": "todo",
        "priority": req.priority,
        "assignee_id": req.assignee_id,
        "creator_id": creator_id,
        "due_date": req.due_date,
        "tags": json.dumps(req.tags, ensure_ascii=False),
        "created_at": now,
        "updated_at": now,
    }
    tasks.append(task)
    _write_jsonl(TASK_DATA_PATH, tasks)
    return TaskResponse(**task)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, req: UpdateTaskRequest):
    tasks = _load_jsonl(TASK_DATA_PATH)
    for task in tasks:
        if task.get("task_id") == task_id:
            if req.title is not None:
                task["title"] = req.title
            if req.description is not None:
                task["description"] = req.description
            if req.status is not None:
                task["status"] = req.status
            if req.priority is not None:
                task["priority"] = req.priority
            if req.assignee_id is not None:
                task["assignee_id"] = req.assignee_id
            if req.due_date is not None:
                task["due_date"] = req.due_date
            if req.tags is not None:
                task["tags"] = json.dumps(req.tags, ensure_ascii=False)
            task["updated_at"] = datetime.now().isoformat(timespec="seconds")
            _write_jsonl(TASK_DATA_PATH, tasks)
            tags = task.get("tags", "")
            if isinstance(tags, list):
                tags = json.dumps(tags, ensure_ascii=False)
            return TaskResponse(
                task_id=task["task_id"],
                title=task["title"],
                description=task.get("description", ""),
                status=task["status"],
                priority=task.get("priority", "medium"),
                assignee_id=task["assignee_id"],
                creator_id=task.get("creator_id", ""),
                due_date=task.get("due_date", ""),
                tags=tags,
                created_at=task.get("created_at"),
            )
    raise HTTPException(status_code=404, detail="Không tìm thấy công việc")


@router.delete("/tasks/{task_id}")
def delete_task(task_id: str):
    tasks = _load_jsonl(TASK_DATA_PATH)
    found = False
    for task in tasks:
        if task.get("task_id") == task_id:
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    tasks = [t for t in tasks if t.get("task_id") != task_id]
    _write_jsonl(TASK_DATA_PATH, tasks)
    return {"task_id": task_id, "deleted": True}
