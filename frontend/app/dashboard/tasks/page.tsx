"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MagnifyingGlass,
  Plus,
  CheckCircle,
  Clock,
  Circle,
  CalendarBlank,
  Tag,
  DotsSixVertical,
  User,
  ArrowRight,
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

const initialTasks: Task[] = [
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
  { label: string; icon: typeof Circle; color: string; bg: string; border: string }
> = {
  todo: {
    label: "Cần làm",
    icon: Circle,
    color: "#7c828a",
    bg: "#f7f7f7",
    border: "#eef0f3",
  },
  in_progress: {
    label: "Đang làm",
    icon: Clock,
    color: "#0052ff",
    bg: "#eef4ff",
    border: "#b6d4fe",
  },
  review: {
    label: "Review",
    icon: Clock,
    color: "#f4b000",
    bg: "#fef9e7",
    border: "#fde68a",
  },
  done: {
    label: "Hoàn thành",
    icon: CheckCircle,
    color: "#05b169",
    bg: "#edfaf3",
    border: "#a7f3d0",
  },
};

const priorityConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  low: { label: "Thấp", color: "#7c828a", bg: "#f7f7f7" },
  medium: { label: "TB", color: "#f4b000", bg: "#fef9e7" },
  high: { label: "Cao", color: "#cf202f", bg: "#fef0f0" },
};

const columns: TaskStatus[] = ["todo", "in_progress", "review", "done"];

function SortableTaskCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priority = priorityConfig[task.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-xl bg-white border border-[#eef0f3] p-4 space-y-3 hover:border-[#dee1e6] transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7c828a] hover:text-[#0a0b0d] cursor-grab active:cursor-grabbing"
          >
            <DotsSixVertical size={16} />
          </button>
          <span className="text-xs font-mono text-[#7c828a]">{task.id}</span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: priority.bg, color: priority.color }}
        >
          {priority.label}
        </span>
      </div>

      <h4 className="text-sm font-medium text-[#0a0b0d] leading-snug pl-6">
        {task.title}
      </h4>

      <div className="flex flex-wrap gap-1.5 pl-6">
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

      <div className="flex items-center justify-between pt-2 border-t border-[#eef0f3] pl-6">
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
}

function TaskCardOverlay({ task }: { task: Task }) {
  const priority = priorityConfig[task.priority];

  return (
    <div className="rounded-xl bg-white border border-[#0052ff] shadow-lg p-4 space-y-3 w-[280px] rotate-2">
      <div className="flex items-start justify-between">
        <span className="text-xs font-mono text-[#7c828a]">{task.id}</span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: priority.bg, color: priority.color }}
        >
          {priority.label}
        </span>
      </div>

      <h4 className="text-sm font-medium text-[#0a0b0d] leading-snug">
        {task.title}
      </h4>

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
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const filtered = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assignee.toLowerCase().includes(search.toLowerCase())
  );

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Check if dropped on a column
    const isColumn = columns.includes(over.id as TaskStatus);
    if (isColumn) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status: over.id as TaskStatus } : t
        )
      );
      return;
    }

    // Check if dropped on another task
    const overTask = tasks.find((t) => t.id === over.id);
    if (!overTask) return;

    if (activeTask.status !== overTask.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status: overTask.status } : t
        )
      );
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const isColumn = columns.includes(over.id as TaskStatus);
    if (isColumn && activeTask.status !== over.id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status: over.id as TaskStatus } : t
        )
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#0a0b0d] tracking-tight">
            Công việc
          </h2>
          <p className="text-[#5b616e] mt-1">
            Kéo thả để thay đổi trạng thái
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
        <div className="flex items-center gap-2">
          {columns.map((col) => {
            const status = statusConfig[col];
            const count = filtered.filter((t) => t.status === col).length;
            return (
              <div
                key={col}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: status.bg, color: status.color }}
              >
                <status.icon size={14} />
                <span className="font-semibold">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="grid grid-cols-4 gap-5">
          {columns.map((col) => {
            const status = statusConfig[col];
            const columnTasks = filtered.filter((t) => t.status === col);

            return (
              <div key={col} className="space-y-4">
                {/* Column header */}
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-3"
                  style={{ backgroundColor: status.bg }}
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: status.color }}
                  >
                    {status.label}
                  </span>
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-white/80 text-[#5b616e]">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column content */}
                <SortableContext
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                  id={col}
                >
                  <div
                    id={col}
                    className="min-h-[200px] space-y-3 rounded-xl p-2 transition-colors"
                    style={{
                      backgroundColor: activeId ? status.bg + "40" : "transparent",
                    }}
                  >
                    {columnTasks.map((task) => (
                      <SortableTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
