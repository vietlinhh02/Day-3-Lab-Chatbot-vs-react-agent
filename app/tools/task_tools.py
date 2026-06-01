import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Literal

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field, model_validator

from app.tools.tools import ToolError, _now, _tool_result, _json_safe

TaskStatus = Literal["todo", "in_progress", "review", "done"]
TaskPriority = Literal["low", "medium", "high"]

TASK_DATA_PATH = Path("app/data/tasks.jsonl")

WRITABLE_STATUSES = {"todo", "in_progress", "review"}


class CreateTaskInput(BaseModel):
    actor_employee_id: str = Field(description="Mã nhân viên thực hiện")
    title: str = Field(min_length=1, description="Tiêu đề công việc")
    description: str = Field(default="", description="Mô tả chi tiết")
    priority: TaskPriority = Field(default="medium", description="Mức ưu tiên: low, medium, high")
    assignee_id: str = Field(description="Mã nhân viên được giao")
    due_date: str = Field(description="Hạn hoàn thành (YYYY-MM-DD)")
    tags: list[str] = Field(default_factory=list, description="Nhãn phân loại")
    confirmed: bool = Field(default=False)


class GetTaskInput(BaseModel):
    task_id: str = Field(description="Mã công việc, ví dụ T-001")


class ListTasksInput(BaseModel):
    assignee_id: str = Field(default="", description="Mã nhân viên (để trống = tất cả)")
    status: str = Field(default="all", description="Lọc theo trạng thái: todo, in_progress, review, done, all")
    limit: int = Field(default=50, ge=1, le=200)


class TaskPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_id: str | None = None
    due_date: str | None = None
    tags: list[str] | None = None


class UpdateTaskInput(BaseModel):
    task_id: str
    patch: TaskPatch
    confirmed: bool = Field(default=False)
    actor_employee_id: str = Field(description="Mã nhân viên thực hiện")

    @model_validator(mode="after")
    def validate_patch(self) -> "UpdateTaskInput":
        if not self.patch.model_dump(exclude_none=True):
            raise ValueError("patch phải chứa ít nhất một trường")
        return self


class DeleteTaskInput(BaseModel):
    task_id: str
    reason: str = Field(min_length=1, description="Lý do xóa")
    confirmed: bool = Field(default=False)
    actor_employee_id: str = Field(description="Mã nhân viên thực hiện")


class SearchTasksInput(BaseModel):
    query: str = Field(default="", description="Từ khóa tìm kiếm")
    status: str = Field(default="all", description="Lọc theo trạng thái")
    priority: str = Field(default="all", description="Lọc theo ưu tiên")
    assignee_id: str = Field(default="", description="Lọc theo người phụ trách")
    limit: int = Field(default=50, ge=1, le=200)


def _load_tasks() -> list[dict[str, Any]]:
    if not TASK_DATA_PATH.exists():
        return []
    tasks = []
    for line in TASK_DATA_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip():
            tasks.append(json.loads(line))
    return tasks


def _write_tasks(tasks: list[dict[str, Any]]) -> None:
    TASK_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    content = "".join(json.dumps(t, ensure_ascii=False) + "\n" for t in tasks)
    TASK_DATA_PATH.write_text(content, encoding="utf-8")


def _find_task(task_id: str, tasks: list[dict[str, Any]]) -> dict[str, Any]:
    for task in tasks:
        if task.get("task_id") == task_id:
            return task
    raise ToolError("TASK_NOT_FOUND", f"Không tìm thấy công việc: {task_id}")


def _next_task_id(tasks: list[dict[str, Any]]) -> str:
    max_id = 0
    for task in tasks:
        task_id = str(task.get("task_id", ""))
        if task_id.startswith("T-") and task_id[2:].isdigit():
            max_id = max(max_id, int(task_id[2:]))
    return f"T-{max_id + 1:03d}"


def _ensure_confirmed(confirmed: bool) -> None:
    if not confirmed:
        raise ToolError(
            "CONFIRMATION_REQUIRED",
            "Thao tác này cần xác nhận trước khi thực hiện.",
        )


def create_task(
    actor_employee_id: str,
    title: str,
    assignee_id: str,
    due_date: str,
    description: str = "",
    priority: str = "medium",
    tags: list[str] | None = None,
    confirmed: bool = False,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        tasks = _load_tasks()
        timestamp = _now()
        normalized_tags = tags or []

        task = {
            "task_id": _next_task_id(tasks),
            "title": title,
            "description": description,
            "status": "todo",
            "priority": priority,
            "assignee_id": assignee_id,
            "creator_id": actor_employee_id,
            "due_date": due_date,
            "tags": normalized_tags,
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        tasks.append(task)
        _write_tasks(tasks)
        return {"item": task}

    return _tool_result(
        "Create_Task",
        {
            "actor_employee_id": actor_employee_id,
            "title": title,
            "description": description,
            "priority": priority,
            "assignee_id": assignee_id,
            "due_date": due_date,
            "tags": tags or [],
            "confirmed": confirmed,
        },
        run,
    )


def get_task(task_id: str) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        task = _find_task(task_id, _load_tasks())
        return {"item": task}

    return _tool_result("Get_Task", {"task_id": task_id}, run)


def list_tasks(
    assignee_id: str = "",
    status: str = "all",
    limit: int = 50,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        tasks = _load_tasks()
        filtered = []
        for task in tasks:
            if assignee_id and task.get("assignee_id") != assignee_id:
                continue
            if status != "all" and task.get("status") != status:
                continue
            filtered.append(task)
            if len(filtered) >= limit:
                break
        return {"items": filtered, "total": len(filtered)}

    return _tool_result(
        "List_Tasks",
        {"assignee_id": assignee_id, "status": status, "limit": limit},
        run,
    )


def update_task(
    task_id: str,
    patch: dict[str, Any],
    actor_employee_id: str,
    confirmed: bool = False,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        tasks = _load_tasks()
        task = _find_task(task_id, tasks)
        before_state = dict(task)

        if task.get("status") == "done" and "status" not in patch:
            raise ToolError("INVALID_STATUS", "Không thể sửa công việc đã hoàn thành.")

        for key, value in patch.items():
            if value is not None:
                task[key] = value
        task["updated_at"] = _now()

        _write_tasks(tasks)
        return {
            "task_id": task_id,
            "updated_fields": sorted(patch.keys()),
            "before_state": before_state,
            "after_state": task,
        }

    return _tool_result(
        "Update_Task",
        {
            "task_id": task_id,
            "patch": patch,
            "actor_employee_id": actor_employee_id,
            "confirmed": confirmed,
        },
        run,
    )


def delete_task(
    task_id: str,
    reason: str,
    actor_employee_id: str,
    confirmed: bool = False,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        _ensure_confirmed(confirmed)
        tasks = _load_tasks()
        task = _find_task(task_id, tasks)
        before_state = dict(task)

        tasks = [t for t in tasks if t.get("task_id") != task_id]
        _write_tasks(tasks)
        return {
            "task_id": task_id,
            "deleted": True,
            "before_state": before_state,
            "reason": reason,
        }

    return _tool_result(
        "Delete_Task",
        {
            "task_id": task_id,
            "reason": reason,
            "actor_employee_id": actor_employee_id,
            "confirmed": confirmed,
        },
        run,
    )


def search_tasks(
    query: str = "",
    status: str = "all",
    priority: str = "all",
    assignee_id: str = "",
    limit: int = 50,
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        tasks = _load_tasks()
        filtered = []
        normalized_query = query.lower()

        for task in tasks:
            if status != "all" and task.get("status") != status:
                continue
            if priority != "all" and task.get("priority") != priority:
                continue
            if assignee_id and task.get("assignee_id") != assignee_id:
                continue
            if normalized_query:
                haystack = " ".join(
                    str(task.get(key, ""))
                    for key in ("task_id", "title", "description", "tags")
                ).lower()
                if normalized_query not in haystack:
                    continue
            filtered.append(task)
            if len(filtered) >= limit:
                break
        return {"items": filtered, "total": len(filtered)}

    return _tool_result(
        "Search_Tasks",
        {
            "query": query,
            "status": status,
            "priority": priority,
            "assignee_id": assignee_id,
            "limit": limit,
        },
        run,
    )


def get_task_tools() -> list[StructuredTool]:
    return [
        StructuredTool.from_function(
            name="Create_Task",
            description="Tạo công việc mới. Cần xác nhận. Input tối thiểu: actor_employee_id, title, assignee_id, due_date, confirmed. description/priority/tags là optional.",
            func=create_task,
            args_schema=CreateTaskInput,
        ),
        StructuredTool.from_function(
            name="Get_Task",
            description="Xem chi tiết công việc theo mã. Input: task_id",
            func=get_task,
            args_schema=GetTaskInput,
        ),
        StructuredTool.from_function(
            name="List_Tasks",
            description="Liệt kê công việc, lọc theo người phụ trách hoặc trạng thái. Input: assignee_id, status, limit",
            func=list_tasks,
            args_schema=ListTasksInput,
        ),
        StructuredTool.from_function(
            name="Update_Task",
            description="Cập nhật công việc (tiêu đề, trạng thái, ưu tiên, người phụ trách, hạn). Cần xác nhận. Input: task_id, patch, actor_employee_id, confirmed",
            func=update_task,
            args_schema=UpdateTaskInput,
        ),
        StructuredTool.from_function(
            name="Delete_Task",
            description="Xóa công việc. Cần xác nhận. Input: task_id, reason, actor_employee_id, confirmed",
            func=delete_task,
            args_schema=DeleteTaskInput,
        ),
        StructuredTool.from_function(
            name="Search_Tasks",
            description="Tìm kiếm công việc theo từ khóa, trạng thái, ưu tiên, người phụ trách. Input: query, status, priority, assignee_id, limit",
            func=search_tasks,
            args_schema=SearchTasksInput,
        ),
    ]
