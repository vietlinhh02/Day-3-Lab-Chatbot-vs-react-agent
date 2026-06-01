const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Lỗi không xác định" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export interface LoginResponse {
  employee_id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  position: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return fetchAPI<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Employees
export interface Employee {
  employee_id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  position: string;
  manager_id: string | null;
  employment_status: string;
  annual_leave_remaining: number;
  sick_leave_remaining: number;
}

export async function getEmployees(department?: string): Promise<Employee[]> {
  const params = new URLSearchParams();
  if (department) params.append("department", department);
  return fetchAPI<Employee[]>(`/employees?${params}`);
}

export async function getEmployee(employeeId: string): Promise<Employee> {
  return fetchAPI<Employee>(`/employees/${employeeId}`);
}

// Leave Requests
export interface LeaveRequest {
  request_id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string | null;
}

export async function getLeaveRequests(
  employeeId?: string,
  status?: string
): Promise<LeaveRequest[]> {
  const params = new URLSearchParams();
  if (employeeId) params.append("employee_id", employeeId);
  if (status) params.append("status", status);
  return fetchAPI<LeaveRequest[]>(`/leave-requests?${params}`);
}

export async function createLeaveRequest(data: {
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
}): Promise<LeaveRequest> {
  return fetchAPI<LeaveRequest>("/leave-requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLeaveRequest(
  requestId: string,
  data: { status?: string; start_date?: string; end_date?: string; reason?: string }
): Promise<{ request_id: string; status: string }> {
  return fetchAPI(`/leave-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Tasks
export interface Task {
  task_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string;
  creator_id: string;
  due_date: string;
  tags: string;
  created_at: string | null;
}

export async function getTasks(
  assigneeId?: string,
  status?: string
): Promise<Task[]> {
  const params = new URLSearchParams();
  if (assigneeId) params.append("assignee_id", assigneeId);
  if (status) params.append("status", status);
  return fetchAPI<Task[]>(`/tasks?${params}`);
}

export async function createTask(
  creatorId: string,
  data: {
    title: string;
    description?: string;
    priority?: string;
    assignee_id: string;
    due_date: string;
    tags?: string[];
  }
): Promise<Task> {
  return fetchAPI<Task>(`/tasks?creator_id=${creatorId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee_id?: string;
    due_date?: string;
    tags?: string[];
  }
): Promise<Task> {
  return fetchAPI<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTask(
  taskId: string
): Promise<{ task_id: string; deleted: boolean }> {
  return fetchAPI(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}
