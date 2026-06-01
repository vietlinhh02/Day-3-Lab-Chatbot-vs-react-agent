"use client";

import { useUser } from "./layout";
import {
  Users,
  CalendarBlank,
  ChatCircleText,
  TrendUp,
} from "phosphor-react";

const stats = [
  {
    label: "Tổng nhân viên",
    value: "128",
    icon: Users,
    change: "+12%",
    changeType: "up" as const,
  },
  {
    label: "Đơn phép chờ duyệt",
    value: "8",
    icon: CalendarBlank,
    change: "-3%",
    changeType: "down" as const,
  },
  {
    label: "Cuộc trò chuyện AI",
    value: "1,234",
    icon: ChatCircleText,
    change: "+28%",
    changeType: "up" as const,
  },
  {
    label: "Hiệu suất trung bình",
    value: "92%",
    icon: TrendUp,
    change: "+5%",
    changeType: "up" as const,
  },
];

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-semibold text-[#0a0b0d] tracking-tight">
          Xin chào, {user.full_name}!
        </h2>
        <p className="text-[#5b616e] mt-1">
          Đây là tổng quan hệ thống quản lý nhân sự hôm nay.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white border border-[#eef0f3] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#5b616e]">{stat.label}</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f7]">
                <stat.icon size={20} className="text-[#5b616e]" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-semibold text-[#0a0b0d] tracking-tight">
                {stat.value}
              </span>
              <span
                className={`text-sm font-medium ${
                  stat.changeType === "up"
                    ? "text-[#05b169]"
                    : "text-[#cf202f]"
                }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
        <h3 className="text-lg font-semibold text-[#0a0b0d] mb-4">
          Hoạt động gần đây
        </h3>
        <div className="space-y-4">
          {[
            {
              action: "Nguyễn Văn An đã gửi đơn xin phép",
              time: "2 phút trước",
            },
            {
              action: "Trần Minh Quân đã phê duyệt đơn phép",
              time: "15 phút trước",
            },
            {
              action: "Lê Thị Hương đã cập nhật hồ sơ nhân viên",
              time: "1 giờ trước",
            },
            {
              action: "Hệ thống đã gửi thông báo nhắc nhở",
              time: "2 giờ trước",
            },
          ].map((activity, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-[#eef0f3] last:border-0"
            >
              <span className="text-sm text-[#0a0b0d]">
                {activity.action}
              </span>
              <span className="text-xs text-[#7c828a]">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
