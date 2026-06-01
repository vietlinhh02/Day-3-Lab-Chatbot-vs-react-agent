"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CalendarBlank,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";

const leaveRequests = [
  {
    id: "LR-1024",
    employee: "Nguyễn Văn An",
    email: "an@example.com",
    type: "sick_leave",
    typeLabel: "Nghỉ ốm",
    startDate: "2026-06-08",
    endDate: "2026-06-09",
    days: 2,
    reason: "Sốt cao",
    status: "submitted",
    submittedAt: "2 giờ trước",
  },
  {
    id: "LR-1023",
    employee: "Trần Thị Bình",
    email: "binh@example.com",
    type: "annual_leave",
    typeLabel: "Phép năm",
    startDate: "2026-06-10",
    endDate: "2026-06-12",
    days: 3,
    reason: "Về quê",
    status: "approved",
    submittedAt: "1 ngày trước",
  },
  {
    id: "LR-1022",
    employee: "Phạm Đức Minh",
    email: "minh@example.com",
    type: "annual_leave",
    typeLabel: "Phép năm",
    startDate: "2026-06-15",
    endDate: "2026-06-15",
    days: 1,
    reason: "Việc cá nhân",
    status: "submitted",
    submittedAt: "1 ngày trước",
  },
  {
    id: "LR-1021",
    employee: "Hoàng Văn Dũng",
    email: "dung@example.com",
    type: "sick_leave",
    typeLabel: "Nghỉ ốm",
    startDate: "2026-06-05",
    endDate: "2026-06-06",
    days: 2,
    reason: "Cảm cúm",
    status: "approved",
    submittedAt: "3 ngày trước",
  },
  {
    id: "LR-1020",
    employee: "Vũ Thị Hoa",
    email: "hoa@example.com",
    type: "annual_leave",
    typeLabel: "Phép năm",
    startDate: "2026-06-03",
    endDate: "2026-06-04",
    days: 2,
    reason: "Đi du lịch",
    status: "rejected",
    submittedAt: "5 ngày trước",
  },
  {
    id: "LR-1019",
    employee: "Nguyễn Văn An",
    email: "an@example.com",
    type: "annual_leave",
    typeLabel: "Phép năm",
    startDate: "2026-05-28",
    endDate: "2026-05-28",
    days: 1,
    reason: "Việc gia đình",
    status: "cancelled",
    submittedAt: "1 tuần trước",
  },
];

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; icon: typeof Clock }
> = {
  submitted: {
    label: "Chờ duyệt",
    bg: "#fef9e7",
    text: "#f4b000",
    icon: Clock,
  },
  approved: {
    label: "Đã duyệt",
    bg: "#edfaf3",
    text: "#05b169",
    icon: CheckCircle,
  },
  rejected: {
    label: "Từ chối",
    bg: "#fef0f0",
    text: "#cf202f",
    icon: XCircle,
  },
  cancelled: {
    label: "Đã hủy",
    bg: "#f7f7f7",
    text: "#7c828a",
    icon: XCircle,
  },
};

export default function LeavePage() {
  const [filter, setFilter] = useState("all");

  const filters = [
    { value: "all", label: "Tất cả" },
    { value: "submitted", label: "Chờ duyệt" },
    { value: "approved", label: "Đã duyệt" },
    { value: "rejected", label: "Từ chối" },
    { value: "cancelled", label: "Đã hủy" },
  ];

  const filtered =
    filter === "all"
      ? leaveRequests
      : leaveRequests.filter((r) => r.status === filter);

  const stats = [
    {
      label: "Tổng đơn",
      value: leaveRequests.length,
      color: "#0052ff",
      bg: "#eef4ff",
    },
    {
      label: "Chờ duyệt",
      value: leaveRequests.filter((r) => r.status === "submitted").length,
      color: "#f4b000",
      bg: "#fef9e7",
    },
    {
      label: "Đã duyệt",
      value: leaveRequests.filter((r) => r.status === "approved").length,
      color: "#05b169",
      bg: "#edfaf3",
    },
    {
      label: "Từ chối",
      value: leaveRequests.filter((r) => r.status === "rejected").length,
      color: "#cf202f",
      bg: "#fef0f0",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#0a0b0d] tracking-tight">
            Đơn xin nghỉ
          </h2>
          <p className="text-[#5b616e] mt-1">
            Quản lý đơn xin nghỉ phép của nhân viên
          </p>
        </div>
        <Button className="rounded-full bg-[#0052ff] text-white font-semibold hover:bg-[#003ecc]">
          <CalendarBlank size={18} className="mr-1" />
          Tạo đơn mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-white border border-[#eef0f3] p-4 flex items-center gap-4"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: stat.bg }}
            >
              <CalendarBlank size={20} style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#0a0b0d]">
                {stat.value}
              </p>
              <p className="text-xs text-[#7c828a]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-[#0a0b0d] text-white"
                : "bg-white text-[#5b616e] border border-[#dee1e6] hover:border-[#0a0b0d]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Leave requests table */}
      <div className="rounded-2xl bg-white border border-[#eef0f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#eef0f3]">
                <th className="text-left text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Mã đơn
                </th>
                <th className="text-left text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Nhân viên
                </th>
                <th className="text-left text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Loại nghỉ
                </th>
                <th className="text-left text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Thời gian
                </th>
                <th className="text-left text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Trạng thái
                </th>
                <th className="text-right text-xs font-semibold text-[#7c828a] uppercase tracking-wider px-6 py-4">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => {
                const status = statusConfig[req.status];
                const StatusIcon = status.icon;
                return (
                  <tr
                    key={req.id}
                    className="border-b border-[#eef0f3] last:border-0 hover:bg-[#f7f7f7]/50"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-[#0052ff]">
                        {req.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getDicebearAvatar(req.email)}
                          alt={req.employee}
                          className="h-8 w-8 rounded-full bg-[#f7f7f7]"
                        />
                        <div>
                          <p className="text-sm font-medium text-[#0a0b0d]">
                            {req.employee}
                          </p>
                          <p className="text-xs text-[#7c828a]">
                            {req.submittedAt}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#0a0b0d]">
                        {req.typeLabel}
                      </span>
                      <p className="text-xs text-[#7c828a]">{req.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#0a0b0d]">
                          {req.startDate}
                        </span>
                        <ArrowRight size={14} className="text-[#7c828a]" />
                        <span className="text-sm text-[#0a0b0d]">
                          {req.endDate}
                        </span>
                      </div>
                      <p className="text-xs text-[#7c828a]">{req.days} ngày</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: status.bg,
                          color: status.text,
                        }}
                      >
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#5b616e] hover:text-[#0a0b0d]"
                      >
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
