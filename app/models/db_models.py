from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Text
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(20), unique=True, nullable=False, index=True)
    alias = Column(String(50), nullable=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    password = Column(String(200), default="password123")
    role = Column(String(20), nullable=False, default="employee")
    department = Column(String(100), nullable=False)
    position = Column(String(200), nullable=False)
    manager_id = Column(String(20), nullable=True)
    manager_email = Column(String(200), nullable=True)
    employment_status = Column(String(20), default="active")
    annual_leave_remaining = Column(Integer, default=12)
    sick_leave_remaining = Column(Integer, default=5)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(20), unique=True, nullable=False, index=True)
    employee_id = Column(String(20), nullable=False, index=True)
    type = Column(String(20), nullable=False)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="submitted")
    manager_email = Column(String(200), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    status = Column(String(20), default="todo")
    priority = Column(String(20), default="medium")
    assignee_id = Column(String(20), nullable=False, index=True)
    creator_id = Column(String(20), nullable=False)
    due_date = Column(String(10), nullable=False)
    tags = Column(Text, default="")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
