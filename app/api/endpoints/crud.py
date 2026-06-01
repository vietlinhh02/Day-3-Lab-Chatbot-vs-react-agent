import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.db_models import Employee, LeaveRequest, Task

router = APIRouter()


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

    class Config:
        from_attributes = True


class LeaveRequestResponse(BaseModel):
    request_id: str
    employee_id: str
    type: str
    start_date: str
    end_date: str
    reason: str
    status: str
    created_at: str | None = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        data = {
            "request_id": obj.request_id,
            "employee_id": obj.employee_id,
            "type": obj.type,
            "start_date": obj.start_date,
            "end_date": obj.end_date,
            "reason": obj.reason,
            "status": obj.status,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
        }
        return cls(**data)


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

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        data = {
            "task_id": obj.task_id,
            "title": obj.title,
            "description": obj.description,
            "status": obj.status,
            "priority": obj.priority,
            "assignee_id": obj.assignee_id,
            "creator_id": obj.creator_id,
            "due_date": obj.due_date,
            "tags": obj.tags,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
        }
        return cls(**data)


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


# Auth
@router.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.email == req.email).first()
    if not employee or employee.password != req.password:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    return LoginResponse(
        employee_id=employee.employee_id,
        full_name=employee.full_name,
        email=employee.email,
        role=employee.role,
        department=employee.department,
        position=employee.position,
    )


# Employees
@router.get("/employees", response_model=list[EmployeeResponse])
def list_employees(
    department: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Employee)
    if department:
        query = query.filter(Employee.department == department)
    if status:
        query = query.filter(Employee.employment_status == status)
    return query.all()


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: str, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    return emp


# Leave Requests
@router.get("/leave-requests", response_model=list[LeaveRequestResponse])
def list_leave_requests(
    employee_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(LeaveRequest)
    if employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    if status:
        query = query.filter(LeaveRequest.status == status)
    results = query.all()
    return [LeaveRequestResponse.from_orm(r) for r in results]


@router.post("/leave-requests", response_model=LeaveRequestResponse)
def create_leave_request(req: CreateLeaveRequest, db: Session = Depends(get_db)):
    last = db.query(LeaveRequest).order_by(LeaveRequest.id.desc()).first()
    new_id = f"LR-{last.id + 1:04d}" if last else "LR-0001"
    leave = LeaveRequest(
        request_id=new_id,
        employee_id=req.employee_id,
        type=req.type,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason,
        status="submitted",
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return LeaveRequestResponse.from_orm(leave)


@router.patch("/leave-requests/{request_id}")
def update_leave_request(
    request_id: str, req: UpdateLeaveRequest, db: Session = Depends(get_db)
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.request_id == request_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn")
    if req.status:
        leave.status = req.status
    if req.start_date:
        leave.start_date = req.start_date
    if req.end_date:
        leave.end_date = req.end_date
    if req.reason:
        leave.reason = req.reason
    db.commit()
    return {"request_id": request_id, "status": leave.status}


# Tasks
@router.get("/tasks", response_model=list[TaskResponse])
def list_tasks(
    assignee_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Task)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if status:
        query = query.filter(Task.status == status)
    results = query.all()
    return [TaskResponse.from_orm(r) for r in results]


@router.post("/tasks", response_model=TaskResponse)
def create_task(creator_id: str, req: CreateTaskRequest, db: Session = Depends(get_db)):
    last = db.query(Task).order_by(Task.id.desc()).first()
    new_id = f"T-{last.id + 1:03d}" if last else "T-001"
    task = Task(
        task_id=new_id,
        title=req.title,
        description=req.description,
        priority=req.priority,
        assignee_id=req.assignee_id,
        creator_id=creator_id,
        due_date=req.due_date,
        tags=json.dumps(req.tags, ensure_ascii=False),
        status="todo",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskResponse.from_orm(task)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str, req: UpdateTaskRequest, db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    if req.title is not None:
        task.title = req.title
    if req.description is not None:
        task.description = req.description
    if req.status is not None:
        task.status = req.status
    if req.priority is not None:
        task.priority = req.priority
    if req.assignee_id is not None:
        task.assignee_id = req.assignee_id
    if req.due_date is not None:
        task.due_date = req.due_date
    if req.tags is not None:
        task.tags = json.dumps(req.tags, ensure_ascii=False)
    db.commit()
    db.refresh(task)
    return TaskResponse.from_orm(task)


@router.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    db.delete(task)
    db.commit()
    return {"task_id": task_id, "deleted": True}
