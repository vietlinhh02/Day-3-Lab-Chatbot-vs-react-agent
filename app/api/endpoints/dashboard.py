from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.db_models import Employee, LeaveRequest, Task

router = APIRouter()


@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_employees = db.query(Employee).filter(Employee.employment_status == "active").count()
    pending_leaves = db.query(LeaveRequest).filter(LeaveRequest.status == "submitted").count()
    total_tasks = db.query(Task).count()
    done_tasks = db.query(Task).filter(Task.status == "done").count()

    # Department distribution
    departments = (
        db.query(Employee.department, func.count(Employee.id))
        .filter(Employee.employment_status == "active")
        .group_by(Employee.department)
        .all()
    )

    # Leave stats by status
    leave_stats = (
        db.query(LeaveRequest.status, func.count(LeaveRequest.id))
        .group_by(LeaveRequest.status)
        .all()
    )

    # Task stats by status
    task_stats = (
        db.query(Task.status, func.count(Task.id))
        .group_by(Task.status)
        .all()
    )

    return {
        "total_employees": total_employees,
        "pending_leaves": pending_leaves,
        "total_tasks": total_tasks,
        "done_tasks": done_tasks,
        "departments": {dept: count for dept, count in departments},
        "leave_by_status": {status: count for status, count in leave_stats},
        "task_by_status": {status: count for status, count in task_stats},
    }


@router.get("/dashboard/recent-activities")
def get_recent_activities(db: Session = Depends(get_db)):
    recent_leaves = (
        db.query(LeaveRequest)
        .order_by(LeaveRequest.created_at.desc())
        .limit(5)
        .all()
    )
    recent_tasks = (
        db.query(Task)
        .order_by(Task.created_at.desc())
        .limit(5)
        .all()
    )

    activities = []
    for leave in recent_leaves:
        activities.append({
            "type": "leave",
            "action": f"Đơn xin nghỉ {leave.type} - {leave.status}",
            "employee_id": leave.employee_id,
            "time": str(leave.created_at) if leave.created_at else "",
        })
    for task in recent_tasks:
        activities.append({
            "type": "task",
            "action": f"Công việc: {task.title}",
            "employee_id": task.assignee_id,
            "time": str(task.created_at) if task.created_at else "",
        })

    return {"activities": activities[:10]}
