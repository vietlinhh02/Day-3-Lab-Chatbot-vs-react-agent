"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CalendarBlank,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";
import { getLeaveRequests, LeaveRequest } from "@/lib/api";

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
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaveRequests();
  }, []);

  async function loadLeaveRequests() {
    try {
      const data = await getLeaveRequests();
      setLeaveRequests(data);
    } catch (error) {
      console.error("Failed to load leave requests:", error);
    } finally {
      setIsLoading(false);
    }
  }

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
                const status = statusConfig[req.status] || statusConfig.submitted;
                const StatusIcon = status.icon;
                return (
                  <tr
                    key={req.request_id}
                    className="border-b border-[#eef0f3] last:border-0 hover:bg-[#f7f7f7]/50"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-[#0052ff]">
                        {req.request_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getDicebearAvatar(req.employee_id)}
                          alt={req.employee_id}
                          className="h-8 w-8 rounded-full bg-[#f7f7f7]"
                        />
                        <span className="text-sm text-[#0a0b0d]">
                          {req.employee_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#0a0b0d]">
                        {req.type === "sick_leave"
                          ? "Nghỉ ốm"
                          : req.type === "annual_leave"
                          ? "Phép năm"
                          : req.type}
                      </span>
                      <p className="text-xs text-[#7c828a]">{req.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#0a0b0d]">
                          {req.start_date}
                        </span>
                        <ArrowRight size={14} className="text-[#7c828a]" />
                        <span className="text-sm text-[#0a0b0d]">
                          {req.end_date}
                        </span>
                      </div>
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
