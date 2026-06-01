"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MagnifyingGlass,
  Plus,
  CheckCircle,
  Clock,
  Circle,
  ArrowRight,
  CalendarBlank,
  User,
  Tag,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";

type TaskStatus = "todo" | "in_progress" | "review" | "done";

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  assignee: string;
  assigneeEmail: string;
  dueDate: string;
  tags: string[];
}

const tasks: Task[] = [
  {
    id: "T-001",
    title: "Cập nhật chính sách nghỉ phép 2026",
    description: "Soạn thảo và phê duyệt chính sách nghỉ phép mới cho năm 2026",
    status: "in_progress",
    priority: "high",
    assignee: "Lê Thị Hương",
    assigneeEmail: "hr@example.com",
    dueDate: "2026-06-15",
    tags: ["HR", "Chính sách"],
  },
  {
    id: "T-002",
    title: "Phê duyệt đơn nghỉ phép tháng 6",
    description: "Xem xét và phê duyệt các đơn nghỉ phép còn chờ duyệt",
    status: "todo",
    priority: "high",
    assignee: "Trần Minh Quân",
    assigneeEmail: "manager@example.com",
    dueDate: "2026-06-10",
    tags: ["Phê duyệt"],
  },
  {
    id: "T-003",
    title: "Onboarding nhân viên mới E009",
    description: "Hoàn tất quy trình onboarding cho nhân viên mới phòng Marketing",
    status: "todo",
    priority: "medium",
    assignee: "Lê Thị Hương",
    assigneeEmail: "hr@example.com",
    dueDate: "2026-06-12",
    tags: ["Onboarding"],
  },
  {
    id: "T-004",
    title: "Đánh giá hiệu suất Q2",
    description: "Tổng hợp đánh giá hiệu suất quý 2 cho phòng Engineering",
    status: "review",
    priority: "medium",
    assignee: "Trần Minh Quân",
    assigneeEmail: "manager@example.com",
    dueDate: "2026-06-30",
    tags: ["Đánh giá"],
  },
  {
    id: "T-005",
    title: "Cập nhật sổ tay nhân sự",
    description: "Thêm mục quy định về làm việc hybrid vào sổ tay",
    status: "done",
    priority: "low",
    assignee: "Lê Thị Hương",
    assigneeEmail: "hr@example.com",
    dueDate: "2026-06-05",
    tags: ["Tài liệu"],
  },
  {
    id: "T-006",
    title: "Setup team building Q3",
    description: "Lên kế hoạch và ngân sách cho hoạt động team building Q3",
    status: "todo",
    priority: "low",
    assignee: "Nguyễn Thị Mai",
    assigneeEmail: "mai@example.com",
    dueDate: "2026-07-01",
    tags: ["Sự kiện"],
  },
  {
    id: "T-007",
    title: "Triển khai hệ thống chấm công mới",
    description: "Test và deploy hệ thống chấm công v2 cho toàn công ty",
    status: "in_progress",
    priority: "high",
    assignee: "Phạm Đức Minh",
    assigneeEmail: "minh@example.com",
    dueDate: "2026-06-20",
    tags: ["IT", "Dự án"],
  },
  {
    id: "T-008",
    title: "Hoàn tất báo cáo nhân sự tháng 5",
    description: "Tổng hợp số liệu và gửi báo cáo cho ban giám đốc",
    status: "done",
    priority: "medium",
    assignee: "Lê Thị Hương",
    assigneeEmail: "hr@example.com",
    dueDate: "2026-06-03",
    tags: ["Báo cáo"],
  },
];

const statusConfig: Record<
  TaskStatus,
  { label: string; icon: typeof Circle; color: string; bg: string }
> = {
  todo: {
    label: "Cần làm",
    icon: Circle,
    color: "#7c828a",
    bg: "#f7f7f7",
  },
  in_progress: {
    label: "Đang làm",
    icon: Clock,
    color: "#0052ff",
    bg: "#eef4ff",
  },
  review: {
    label: "Review",
    icon: Clock,
    color: "#f4b000",
    bg: "#fef9e7",
  },
  done: {
    label: "Hoàn thành",
    icon: CheckCircle,
    color: "#05b169",
    bg: "#edfaf3",
  },
};

const priorityConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  low: { label: "Thấp", color: "#7c828a", bg: "#f7f7f7" },
  medium: { label: "Trung bình", color: "#f4b000", bg: "#fef9e7" },
  high: { label: "Cao", color: "#cf202f", bg: "#fef0f0" },
};

const columns: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"board" | "list">("board");

  const filtered = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assignee.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#0a0b0d] tracking-tight">
            Công việc
          </h2>
          <p className="text-[#5b616e] mt-1">
            Quản lý nhiệm vụ và theo dõi tiến độ
          </p>
        </div>
        <Button className="rounded-full bg-[#0052ff] text-white font-semibold hover:bg-[#003ecc]">
          <Plus size={18} className="mr-1" />
          Tạo công việc
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7c828a]"
            size={16}
          />
          <Input
            placeholder="Tìm kiếm công việc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl border-[#dee1e6] bg-white"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("board")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              view === "board"
                ? "bg-[#0a0b0d] text-white"
                : "bg-white text-[#5b616e] border border-[#dee1e6]"
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-[#0a0b0d] text-white"
                : "bg-white text-[#5b616e] border border-[#dee1e6]"
            }`}
          >
            Danh sách
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {columns.map((col) => {
          const status = statusConfig[col];
          const count = filtered.filter((t) => t.status === col).length;
          return (
            <div
              key={col}
              className="rounded-xl bg-white border border-[#eef0f3] p-4 flex items-center gap-3"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: status.bg }}
              >
                <status.icon size={20} style={{ color: status.color }} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#0a0b0d]">
                  {count}
                </p>
                <p className="text-xs text-[#7c828a]">{status.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Board view */}
      {view === "board" && (
        <div className="grid grid-cols-4 gap-5">
          {columns.map((col) => {
            const status = statusConfig[col];
            const columnTasks = filtered.filter((t) => t.status === col);
            return (
              <div key={col} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm font-semibold text-[#0a0b0d]">
                    {status.label}
                  </span>
                  <span className="text-xs text-[#7c828a] bg-[#f7f7f7] px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnTasks.map((task) => {
                    const priority = priorityConfig[task.priority];
                    return (
                      <div
                        key={task.id}
                        className="rounded-xl bg-white border border-[#eef0f3] p-4 space-y-3 hover:border-[#dee1e6] transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-mono text-[#7c828a]">
                            {task.id}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{
                              backgroundColor: priority.bg,
                              color: priority.color,
                            }}
                          >
                            {priority.label}
                          </span>
                        </div>

                        <h4 className="text-sm font-medium text-[#0a0b0d] leading-snug">
                          {task.title}
                        </h4>

                        <div className="flex flex-wrap gap-1.5">
                          {task.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full bg-[#f7f7f7] px-2 py-0.5 text-xs text-[#5b616e]"
                            >
                              <Tag size={10} />
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#eef0f3]">
                          <div className="flex items-center gap-2">
                            <img
                              src={getDicebearAvatar(task.assigneeEmail)}
                              alt={task.assignee}
                              className="h-6 w-6 rounded-full bg-[#f7f7f7]"
                            />
                            <span className="text-xs text-[#5b616e]">
                              {task.assignee.split(" ").pop()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#7c828a]">
                            <CalendarBlank size={12} />
                            {task.dueDate.slice(5)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="rounded-2xl bg-white border border-[#eef0f3] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#eef0f3]">
                <th className="text-left text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Công việc
                </th>
                <th className="text-left text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Trạng thái
                </th>
                <th className="text-left text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Ưu tiên
                </th>
                <th className="text-left text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Người phụ trách
                </th>
                <th className="text-left text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Hạn
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const status = statusConfig[task.status];
                const priority = priorityConfig[task.priority];
                return (
                  <tr
                    key={task.id}
                    className="border-b border-[#eef0f3] last:border-0 hover:bg-[#f7f7f7]/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <status.icon
                          size={18}
                          style={{ color: status.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-[#0a0b0d]">
                            {task.title}
                          </p>
                          <p className="text-xs text-[#7c828a]">{task.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: priority.bg,
                          color: priority.color,
                        }}
                      >
                        {priority.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={getDicebearAvatar(task.assigneeEmail)}
                          alt={task.assignee}
                          className="h-6 w-6 rounded-full bg-[#f7f7f7]"
                        />
                        <span className="text-sm text-[#0a0b0d]">
                          {task.assignee}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-[#5b616e]">
                        <CalendarBlank size={14} />
                        {task.dueDate}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
