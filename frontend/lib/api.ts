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

// Dashboard
export interface DashboardStats {
  total_employees: number;
  pending_leaves: number;
  total_tasks: number;
  done_tasks: number;
  departments: Record<string, number>;
  leave_by_status: Record<string, number>;
  task_by_status: Record<string, number>;
}

export interface Activity {
  type: string;
  action: string;
  employee_id: string;
  time: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchAPI<DashboardStats>("/dashboard/stats");
}

export async function getRecentActivities(): Promise<Activity[]> {
  const data = await fetchAPI<{ activities: Activity[] }>("/dashboard/recent-activities");
  return data.activities;
}

// Chat
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  requires_confirmation: boolean;
  trace: any[];
}

export async function sendChatMessage(
  message: string,
  sessionId?: string,
  employeeId: string = "current_user",
  role: string = "employee"
): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        employee_id: employeeId,
        role,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Lỗi không xác định" }));
      throw new Error(error.detail || `HTTP ${res.status}`);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export interface StreamEvent {
  type: "trace" | "chunk" | "done";
  tool?: string;
  args?: any;
  content?: string;
  session_id?: string;
  requires_confirmation?: boolean;
  latency_ms?: number;
}

export async function sendChatMessageStream(
  message: string,
  onEvent: (event: StreamEvent) => void,
  sessionId?: string,
  employeeId: string = "current_user",
  role: string = "employee"
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      employee_id: employeeId,
      role,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Lỗi không xác định" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No reader");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const event = JSON.parse(data) as StreamEvent;
          onEvent(event);
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}
