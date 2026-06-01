import pytest

from app.tools.task_tools import (
    create_task,
    get_task,
    list_tasks,
    update_task,
    delete_task,
    search_tasks,
    get_task_tools,
)


@pytest.fixture(autouse=True)
def mock_task_data(tmp_path, monkeypatch):
    test_file = tmp_path / "tasks.jsonl"
    monkeypatch.setattr("app.tools.task_tools.TASK_DATA_PATH", test_file)
    return test_file


def test_create_task_requires_confirmation():
    result = create_task(
        actor_employee_id="E001",
        title="Cập nhật chính sách",
        description="Mô tả chi tiết",
        priority="high",
        assignee_id="E002",
        due_date="2026-06-15",
        tags=["HR"],
    )
    assert result["ok"] is False
    assert result["error_code"] == "CONFIRMATION_REQUIRED"


def test_create_task():
    result = create_task(
        actor_employee_id="E001",
        title="Cập nhật chính sách nghỉ phép",
        description="Soạn thảo chính sách mới",
        priority="high",
        assignee_id="E002",
        due_date="2026-06-15",
        tags=["HR", "Chính sách"],
        confirmed=True,
    )
    assert result["ok"] is True
    assert result["item"]["task_id"] == "T-001"
    assert result["item"]["status"] == "todo"
    assert result["item"]["title"] == "Cập nhật chính sách nghỉ phép"


def test_get_task():
    create_task(
        actor_employee_id="E001",
        title="Test task",
        description="",
        priority="medium",
        assignee_id="E002",
        due_date="2026-06-15",
        tags=[],
        confirmed=True,
    )
    result = get_task("T-001")
    assert result["ok"] is True
    assert result["item"]["task_id"] == "T-001"


def test_get_task_not_found():
    result = get_task("T-999")
    assert result["ok"] is False
    assert result["error_code"] == "TASK_NOT_FOUND"


def test_list_tasks():
    create_task(
        actor_employee_id="E001",
        title="Task 1",
        description="",
        priority="low",
        assignee_id="E001",
        due_date="2026-06-10",
        tags=[],
        confirmed=True,
    )
    create_task(
        actor_employee_id="E001",
        title="Task 2",
        description="",
        priority="high",
        assignee_id="E002",
        due_date="2026-06-15",
        tags=[],
        confirmed=True,
    )

    result = list_tasks()
    assert result["ok"] is True
    assert result["total"] == 2

    result = list_tasks(assignee_id="E001")
    assert result["ok"] is True
    assert result["total"] == 1


def test_update_task():
    create_task(
        actor_employee_id="E001",
        title="Test task",
        description="",
        priority="medium",
        assignee_id="E002",
        due_date="2026-06-15",
        tags=[],
        confirmed=True,
    )

    result = update_task(
        task_id="T-001",
        patch={"status": "in_progress", "priority": "high"},
        actor_employee_id="E001",
        confirmed=True,
    )
    assert result["ok"] is True
    assert "status" in result["updated_fields"]
    assert "priority" in result["updated_fields"]


def test_update_task_requires_confirmation():
    create_task(
        actor_employee_id="E001",
        title="Test task",
        description="",
        priority="medium",
        assignee_id="E002",
        due_date="2026-06-15",
        tags=[],
        confirmed=True,
    )

    result = update_task(
        task_id="T-001",
        patch={"status": "in_progress"},
        actor_employee_id="E001",
    )
    assert result["ok"] is False
    assert result["error_code"] == "CONFIRMATION_REQUIRED"


def test_delete_task():
    create_task(
        actor_employee_id="E001",
        title="Test task",
        description="",
        priority="medium",
        assignee_id="E002",
        due_date="2026-06-15",
        tags=[],
        confirmed=True,
    )

    result = delete_task(
        task_id="T-001",
        reason="Không cần thiết",
        actor_employee_id="E001",
        confirmed=True,
    )
    assert result["ok"] is True
    assert result["deleted"] is True

    # Verify deleted
    result = get_task("T-001")
    assert result["ok"] is False


def test_search_tasks():
    create_task(
        actor_employee_id="E001",
        title="Cập nhật chính sách",
        description="Soạn thảo",
        priority="high",
        assignee_id="E001",
        due_date="2026-06-15",
        tags=["HR"],
        confirmed=True,
    )
    create_task(
        actor_employee_id="E001",
        title="Review code",
        description="Review PR",
        priority="low",
        assignee_id="E002",
        due_date="2026-06-20",
        tags=["IT"],
        confirmed=True,
    )

    result = search_tasks(query="chính sách")
    assert result["ok"] is True
    assert result["total"] == 1

    result = search_tasks(priority="high")
    assert result["ok"] is True
    assert result["total"] == 1

    result = search_tasks(assignee_id="E002")
    assert result["ok"] is True
    assert result["total"] == 1


def test_exports_langchain_tools():
    exported = get_task_tools()

    assert [tool.name for tool in exported] == [
        "Create_Task",
        "Get_Task",
        "List_Tasks",
        "Update_Task",
        "Delete_Task",
        "Search_Tasks",
    ]
