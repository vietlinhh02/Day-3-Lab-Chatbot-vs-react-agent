import json
from datetime import datetime, timezone

from app.database import SessionLocal, init_db
from app.models.db_models import Employee, LeaveRequest, Task


def seed():
    init_db()
    db = SessionLocal()

    try:
        # Check if data already exists
        if db.query(Employee).count() > 0:
            print("Database already seeded!")
            return

        now = datetime.now(timezone.utc)

        # Employees
        employees = [
            Employee(
                employee_id="E001",
                alias="current_user",
                full_name="Nguyễn Văn An",
                email="an@example.com",
                password="password123",
                role="employee",
                department="Engineering",
                position="Backend Developer",
                manager_id="M001",
                manager_email="manager@example.com",
                employment_status="active",
                annual_leave_remaining=4,
                sick_leave_remaining=5,
            ),
            Employee(
                employee_id="M001",
                alias="demo_manager",
                full_name="Trần Minh Quân",
                email="manager@example.com",
                password="password123",
                role="manager",
                department="Engineering",
                position="Engineering Manager",
                manager_id=None,
                manager_email=None,
                employment_status="active",
                annual_leave_remaining=8,
                sick_leave_remaining=5,
            ),
            Employee(
                employee_id="HR001",
                alias="demo_hr",
                full_name="Lê Thị Hương",
                email="hr@example.com",
                password="password123",
                role="hr_admin",
                department="Human Resources",
                position="HR Manager",
                manager_id=None,
                manager_email=None,
                employment_status="active",
                annual_leave_remaining=10,
                sick_leave_remaining=5,
            ),
            Employee(
                employee_id="E002",
                alias=None,
                full_name="Trần Thị Bình",
                email="binh@example.com",
                password="password123",
                role="employee",
                department="Marketing",
                position="Marketing Specialist",
                manager_id="HR001",
                manager_email="hr@example.com",
                employment_status="active",
                annual_leave_remaining=10,
                sick_leave_remaining=5,
            ),
            Employee(
                employee_id="E003",
                alias=None,
                full_name="Phạm Đức Minh",
                email="minh@example.com",
                password="password123",
                role="employee",
                department="Engineering",
                position="Frontend Developer",
                manager_id="M001",
                manager_email="manager@example.com",
                employment_status="active",
                annual_leave_remaining=12,
                sick_leave_remaining=5,
            ),
            Employee(
                employee_id="E004",
                alias=None,
                full_name="Hoàng Văn Dũng",
                email="dung@example.com",
                password="password123",
                role="employee",
                department="Sales",
                position="Sales Executive",
                manager_id="HR001",
                manager_email="hr@example.com",
                employment_status="active",
                annual_leave_remaining=8,
                sick_leave_remaining=5,
            ),
            Employee(
                employee_id="E005",
                alias=None,
                full_name="Nguyễn Thị Mai",
                email="mai@example.com",
                password="password123",
                role="manager",
                department="Sales",
                position="Sales Manager",
                manager_id=None,
                manager_email=None,
                employment_status="active",
                annual_leave_remaining=10,
                sick_leave_remaining=5,
            ),
        ]

        for emp in employees:
            db.add(emp)

        # Leave Requests
        leave_requests = [
            LeaveRequest(
                request_id="LR-0001",
                employee_id="E001",
                type="sick_leave",
                start_date="2026-06-08",
                end_date="2026-06-09",
                reason="Sốt cao",
                status="submitted",
            ),
            LeaveRequest(
                request_id="LR-0002",
                employee_id="E002",
                type="annual_leave",
                start_date="2026-06-10",
                end_date="2026-06-12",
                reason="Về quê",
                status="approved",
            ),
            LeaveRequest(
                request_id="LR-0003",
                employee_id="E003",
                type="annual_leave",
                start_date="2026-06-15",
                end_date="2026-06-15",
                reason="Việc cá nhân",
                status="submitted",
            ),
            LeaveRequest(
                request_id="LR-0004",
                employee_id="E004",
                type="sick_leave",
                start_date="2026-06-05",
                end_date="2026-06-06",
                reason="Cảm cúm",
                status="approved",
            ),
            LeaveRequest(
                request_id="LR-0005",
                employee_id="E001",
                type="annual_leave",
                start_date="2026-05-28",
                end_date="2026-05-28",
                reason="Việc gia đình",
                status="cancelled",
            ),
        ]

        for lr in leave_requests:
            db.add(lr)

        # Tasks
        tasks = [
            Task(
                task_id="T-001",
                title="Cập nhật chính sách nghỉ phép 2026",
                description="Soạn thảo và phê duyệt chính sách nghỉ phép mới cho năm 2026",
                status="in_progress",
                priority="high",
                assignee_id="HR001",
                creator_id="HR001",
                due_date="2026-06-15",
                tags=json.dumps(["HR", "Chính sách"], ensure_ascii=False),
            ),
            Task(
                task_id="T-002",
                title="Phê duyệt đơn nghỉ phép tháng 6",
                description="Xem xét và phê duyệt các đơn nghỉ phép còn chờ duyệt",
                status="todo",
                priority="high",
                assignee_id="M001",
                creator_id="HR001",
                due_date="2026-06-10",
                tags=json.dumps(["Phê duyệt"], ensure_ascii=False),
            ),
            Task(
                task_id="T-003",
                title="Onboarding nhân viên mới E009",
                description="Hoàn tất quy trình onboarding cho nhân viên mới phòng Marketing",
                status="todo",
                priority="medium",
                assignee_id="HR001",
                creator_id="HR001",
                due_date="2026-06-12",
                tags=json.dumps(["Onboarding"], ensure_ascii=False),
            ),
            Task(
                task_id="T-004",
                title="Đánh giá hiệu suất Q2",
                description="Tổng hợp đánh giá hiệu suất quý 2 cho phòng Engineering",
                status="review",
                priority="medium",
                assignee_id="M001",
                creator_id="HR001",
                due_date="2026-06-30",
                tags=json.dumps(["Đánh giá"], ensure_ascii=False),
            ),
            Task(
                task_id="T-005",
                title="Cập nhật sổ tay nhân sự",
                description="Thêm mục quy định về làm việc hybrid vào sổ tay",
                status="done",
                priority="low",
                assignee_id="HR001",
                creator_id="HR001",
                due_date="2026-06-05",
                tags=json.dumps(["Tài liệu"], ensure_ascii=False),
            ),
            Task(
                task_id="T-006",
                title="Setup team building Q3",
                description="Lên kế hoạch và ngân sách cho hoạt động team building Q3",
                status="todo",
                priority="low",
                assignee_id="E005",
                creator_id="HR001",
                due_date="2026-07-01",
                tags=json.dumps(["Sự kiện"], ensure_ascii=False),
            ),
            Task(
                task_id="T-007",
                title="Triển khai hệ thống chấm công mới",
                description="Test và deploy hệ thống chấm công v2 cho toàn công ty",
                status="in_progress",
                priority="high",
                assignee_id="E003",
                creator_id="M001",
                due_date="2026-06-20",
                tags=json.dumps(["IT", "Dự án"], ensure_ascii=False),
            ),
            Task(
                task_id="T-008",
                title="Hoàn tất báo cáo nhân sự tháng 5",
                description="Tổng hợp số liệu và gửi báo cáo cho ban giám đốc",
                status="done",
                priority="medium",
                assignee_id="HR001",
                creator_id="HR001",
                due_date="2026-06-03",
                tags=json.dumps(["Báo cáo"], ensure_ascii=False),
            ),
        ]

        for task in tasks:
            db.add(task)

        db.commit()
        print("Seed data inserted successfully!")
        print(f"- {len(employees)} employees")
        print(f"- {len(leave_requests)} leave requests")
        print(f"- {len(tasks)} tasks")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
