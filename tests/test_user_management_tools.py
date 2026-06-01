import json

import pytest

from app.tools.user_management_tools import (
    create_employee,
    get_employee,
    search_employees,
    update_employee,
    deactivate_employee,
    activate_employee,
    update_leave_balance,
    get_user_management_tools,
    EmployeePatch,
    EMPLOYEE_DATA_PATH,
)


@pytest.fixture(autouse=True)
def mock_employee_data(tmp_path, monkeypatch):
    data = {
        "employees": [
            {
                "employee_id": "E001",
                "alias": "current_user",
                "full_name": "Nguyễn Văn An",
                "email": "an@example.com",
                "role": "employee",
                "department": "Engineering",
                "position": "Backend Developer",
                "manager_id": "M001",
                "manager_email": "manager@example.com",
                "employment_status": "active",
                "annual_leave_remaining": 4,
                "sick_leave_remaining": 5,
            },
            {
                "employee_id": "M001",
                "alias": "demo_manager",
                "full_name": "Trần Minh Quân",
                "email": "manager@example.com",
                "role": "manager",
                "department": "Engineering",
                "position": "Engineering Manager",
                "manager_id": None,
                "employment_status": "active",
                "annual_leave_remaining": 8,
                "sick_leave_remaining": 5,
            },
            {
                "employee_id": "HR001",
                "alias": "demo_hr",
                "full_name": "Lê Thị Hương",
                "email": "hr@example.com",
                "role": "hr_admin",
                "department": "Human Resources",
                "position": "HR Manager",
                "manager_id": None,
                "employment_status": "active",
                "annual_leave_remaining": 10,
                "sick_leave_remaining": 5,
            },
        ]
    }
    test_file = tmp_path / "employees.json"
    test_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    monkeypatch.setattr("app.tools.user_management_tools.EMPLOYEE_DATA_PATH", test_file)
    return test_file


def test_get_employee_as_self():
    result = get_employee("current_user", "current_user")
    assert result["ok"] is True
    assert result["item"]["employee_id"] == "E001"
    assert "password" not in result["item"]


def test_get_employee_as_hr():
    result = get_employee("demo_hr", "E001")
    assert result["ok"] is True
    assert result["item"]["employee_id"] == "E001"


def test_get_employee_forbidden():
    result = get_employee("current_user", "HR001")
    assert result["ok"] is False
    assert result["error_code"] == "FORBIDDEN"


def test_search_employees_as_hr():
    result = search_employees("demo_hr", query="Văn An")
    assert result["ok"] is True
    assert len(result["items"]) == 1
    assert result["items"][0]["full_name"] == "Nguyễn Văn An"


def test_search_employees_by_department():
    result = search_employees("demo_hr", department="Engineering")
    assert result["ok"] is True
    assert len(result["items"]) == 2


def test_search_employees_forbidden():
    result = search_employees("current_user", query="An")
    assert result["ok"] is False
    assert result["error_code"] == "FORBIDDEN"


def test_create_requires_confirmation():
    result = create_employee(
        actor_employee_id="demo_hr",
        full_name="Phạm Đức Minh",
        email="minh@example.com",
        department="Engineering",
        position="Frontend Developer",
        annual_leave_remaining=12,
        sick_leave_remaining=5,
    )
    assert result["ok"] is False
    assert result["error_code"] == "CONFIRMATION_REQUIRED"


def test_create_employee_as_hr():
    result = create_employee(
        actor_employee_id="demo_hr",
        full_name="Phạm Đức Minh",
        email="minh@example.com",
        department="Engineering",
        position="Frontend Developer",
        annual_leave_remaining=12,
        sick_leave_remaining=5,
        confirmed=True,
        confirmation_source="test",
    )
    assert result["ok"] is True
    assert result["item"]["employee_id"].startswith("E")
    assert result["item"]["employment_status"] == "active"


def test_create_employee_forbidden():
    result = create_employee(
        actor_employee_id="current_user",
        full_name="Test User",
        email="test@example.com",
        department="Engineering",
        position="Developer",
        annual_leave_remaining=12,
        sick_leave_remaining=5,
        confirmed=True,
        confirmation_source="test",
    )
    assert result["ok"] is False
    assert result["error_code"] == "FORBIDDEN"


def test_update_employee_as_hr():
    result = update_employee(
        actor_employee_id="demo_hr",
        employee_id="E001",
        patch=EmployeePatch(position="Senior Backend Developer"),
        confirmed=True,
        confirmation_source="test",
    )
    assert result["ok"] is True
    assert "position" in result["updated_fields"]


def test_deactivate_employee():
    result = deactivate_employee(
        actor_employee_id="demo_hr",
        employee_id="E001",
        reason="Nghỉ việc",
        confirmed=True,
        confirmation_source="test",
    )
    assert result["ok"] is True
    assert result["employment_status"] == "inactive"


def test_activate_employee():
    # First deactivate
    deactivate_employee(
        actor_employee_id="demo_hr",
        employee_id="E001",
        reason="Test",
        confirmed=True,
        confirmation_source="test",
    )
    # Then activate
    result = activate_employee(
        actor_employee_id="demo_hr",
        employee_id="E001",
        reason="Quay lại làm việc",
        confirmed=True,
        confirmation_source="test",
    )
    assert result["ok"] is True
    assert result["employment_status"] == "active"


def test_update_leave_balance():
    result = update_leave_balance(
        actor_employee_id="demo_hr",
        employee_id="E001",
        annual_leave_remaining=10,
        sick_leave_remaining=5,
        reason="Điều chỉnh theo hợp đồng mới",
        confirmed=True,
        confirmation_source="test",
    )
    assert result["ok"] is True
    assert result["annual_leave_remaining"] == 10
    assert result["sick_leave_remaining"] == 5


def test_exports_langchain_tools():
    exported = get_user_management_tools()

    assert [tool.name for tool in exported] == [
        "Create_Employee",
        "Get_Employee",
        "Search_Employees",
        "Update_Employee",
        "Deactivate_Employee",
        "Activate_Employee",
        "Update_Leave_Balance",
    ]
