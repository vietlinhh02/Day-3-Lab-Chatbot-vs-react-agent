"use client";

import { useState, useEffect } from "react";
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
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
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
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";
import { getTasks, updateTask, Task as ApiTask } from "@/lib/api";

type TaskStatus = "todo" | "in_progress" | "review" | "done";

interface Task extends ApiTask {
  parsedTags: string[];
}

const statusConfig: Record<
  TaskStatus,
  { label: string; icon: typeof Circle; color: string; bg: string }
> = {
  todo: { label: "Cần làm", icon: Circle, color: "#7c828a", bg: "#f7f7f7" },
  in_progress: { label: "Đang làm", icon: Clock, color: "#0052ff", bg: "#eef4ff" },
  review: { label: "Review", icon: Clock, color: "#f4b000", bg: "#fef9e7" },
  done: { label: "Hoàn thành", icon: CheckCircle, color: "#05b169", bg: "#edfaf3" },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Thấp", color: "#7c828a", bg: "#f7f7f7" },
  medium: { label: "TB", color: "#f4b000", bg: "#fef9e7" },
  high: { label: "Cao", color: "#cf202f", bg: "#fef0f0" },
};

const columns: TaskStatus[] = ["todo", "in_progress", "review", "done"];

function parseTags(tags: string): string[] {
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

function DroppableColumn({
  status,
  children,
}: {
  status: TaskStatus;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = statusConfig[status];

  return (
    <div
      ref={setNodeRef}
      className="min-h-[200px] space-y-3 rounded-xl p-2 transition-colors"
      style={{
        backgroundColor: isOver ? config.bg : "transparent",
        outline: isOver ? `2px dashed ${config.color}` : "none",
        outlineOffset: "-2px",
      }}
    >
      {children}
    </div>
  );
}

function SortableTaskCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.task_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const tags = task.parsedTags;

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
          <span className="text-xs font-mono text-[#7c828a]">{task.task_id}</span>
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

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-6">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-[#f7f7f7] px-2 py-0.5 text-xs text-[#5b616e]"
            >
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#eef0f3] pl-6">
        <div className="flex items-center gap-2">
          <img
            src={getDicebearAvatar(task.assignee_id)}
            alt={task.assignee_id}
            className="h-6 w-6 rounded-full bg-[#f7f7f7]"
          />
          <span className="text-xs text-[#5b616e]">{task.assignee_id}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#7c828a]">
          <CalendarBlank size={12} />
          {task.due_date?.slice(5)}
        </div>
      </div>
    </div>
  );
}

function TaskCardOverlay({ task }: { task: Task }) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <div className="rounded-xl bg-white border-2 border-[#0052ff] shadow-2xl p-4 space-y-3 w-[280px] rotate-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-mono text-[#7c828a]">{task.task_id}</span>
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
      <div className="flex items-center gap-2 pt-2 border-t border-[#eef0f3]">
        <img
          src={getDicebearAvatar(task.assignee_id)}
          alt={task.assignee_id}
          className="h-5 w-5 rounded-full bg-[#f7f7f7]"
        />
        <span className="text-xs text-[#5b616e]">{task.assignee_id}</span>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const data = await getTasks();
      setTasks(data.map((t) => ({ ...t, parsedTags: parseTags(t.tags) })));
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assignee_id.toLowerCase().includes(search.toLowerCase())
  );

  const activeTask = activeId ? tasks.find((t) => t.task_id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.task_id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    let newStatus: string | null = null;

    if (columns.includes(overId as TaskStatus)) {
      if (activeTask.status !== overId) {
        newStatus = overId;
      }
    } else {
      const overTask = tasks.find((t) => t.task_id === overId);
      if (overTask && activeTask.status !== overTask.status) {
        newStatus = overTask.status;
      }
    }

    if (newStatus) {
      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === active.id ? { ...t, status: newStatus! } : t
        )
      );

      try {
        await updateTask(active.id as string, { status: newStatus });
      } catch (error) {
        console.error("Failed to update task:", error);
        loadTasks();
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0052ff] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#0a0b0d] tracking-tight">
            Công việc
          </h2>
          <p className="text-[#5b616e] mt-1">Kéo thả để thay đổi trạng thái</p>
        </div>
        <Button className="rounded-full bg-[#0052ff] text-white font-semibold hover:bg-[#003ecc]">
          <Plus size={18} className="mr-1" />
          Tạo công việc
        </Button>
      </div>

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-5">
          {columns.map((col) => {
            const status = statusConfig[col];
            const columnTasks = filtered.filter((t) => t.status === col);

            return (
              <div key={col} className="space-y-4">
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-3"
                  style={{ backgroundColor: status.bg }}
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm font-semibold" style={{ color: status.color }}>
                    {status.label}
                  </span>
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-white/80 text-[#5b616e]">
                    {columnTasks.length}
                  </span>
                </div>

                <DroppableColumn status={col}>
                  <SortableContext
                    items={columnTasks.map((t) => t.task_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {columnTasks.map((task) => (
                      <SortableTaskCard key={task.task_id} task={task} />
                    ))}
                  </SortableContext>
                </DroppableColumn>
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
