"use client";

import { useUser } from "./layout";
import {
  Users,
  CalendarBlank,
  ChatCircleText,
  TrendUp,
  TrendDown,
  ArrowUpRight,
} from "phosphor-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const stats = [
  {
    label: "Tổng nhân viên",
    value: "128",
    icon: Users,
    change: "+12%",
    changeType: "up" as const,
    color: "#0052ff",
    bgColor: "#eef4ff",
  },
  {
    label: "Đơn phép chờ duyệt",
    value: "8",
    icon: CalendarBlank,
    change: "-3%",
    changeType: "down" as const,
    color: "#f4b000",
    bgColor: "#fef9e7",
  },
  {
    label: "Cuộc trò chuyện AI",
    value: "1,234",
    icon: ChatCircleText,
    change: "+28%",
    changeType: "up" as const,
    color: "#05b169",
    bgColor: "#edfaf3",
  },
  {
    label: "Hiệu suất trung bình",
    value: "92%",
    icon: TrendUp,
    change: "+5%",
    changeType: "up" as const,
    color: "#8b5cf6",
    bgColor: "#f3f0ff",
  },
];

const lineChartData = {
  labels: ["T1", "T2", "T3", "T4", "T5", "T6"],
  datasets: [
    {
      label: "Nhân viên mới",
      data: [12, 19, 15, 25, 22, 30],
      borderColor: "#0052ff",
      backgroundColor: "rgba(0, 82, 255, 0.08)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ],
};

const barChartData = {
  labels: ["T1", "T2", "T3", "T4", "T5", "T6"],
  datasets: [
    {
      label: "Đơn phép",
      data: [15, 22, 18, 28, 20, 25],
      backgroundColor: "#0052ff",
      borderRadius: 8,
      barThickness: 32,
    },
  ],
};

const doughnutData = {
  labels: ["Engineering", "Marketing", "Sales", "HR", "Finance"],
  datasets: [
    {
      data: [45, 25, 20, 15, 10],
      backgroundColor: [
        "#0052ff",
        "#05b169",
        "#f4b000",
        "#8b5cf6",
        "#cf202f",
      ],
      borderWidth: 0,
      cutout: "70%",
    },
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "#0a0b0d",
      titleColor: "#ffffff",
      bodyColor: "#ffffff",
      padding: 12,
      cornerRadius: 12,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      border: {
        display: false,
      },
      ticks: {
        color: "#7c828a",
        font: {
          size: 12,
        },
      },
    },
    y: {
      grid: {
        color: "#eef0f3",
      },
      border: {
        display: false,
      },
      ticks: {
        color: "#7c828a",
        font: {
          size: 12,
        },
      },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "right" as const,
      labels: {
        padding: 16,
        usePointStyle: true,
        pointStyle: "circle",
        color: "#0a0b0d",
        font: {
          size: 13,
        },
      },
    },
    tooltip: {
      backgroundColor: "#0a0b0d",
      titleColor: "#ffffff",
      bodyColor: "#ffffff",
      padding: 12,
      cornerRadius: 12,
    },
  },
};

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white border border-[#eef0f3] p-5 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#5b616e]">
                {stat.label}
              </span>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: stat.bgColor }}
              >
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span
                className="text-3xl font-semibold text-[#0a0b0d] tracking-tight"
                style={{ fontFamily: "var(--font-inter-tight)" }}
              >
                {stat.value}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  stat.changeType === "up"
                    ? "bg-[#edfaf3] text-[#05b169]"
                    : "bg-[#fef9e7] text-[#f4b000]"
                }`}
              >
                {stat.changeType === "up" ? (
                  <TrendUp size={12} />
                ) : (
                  <TrendDown size={12} />
                )}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line chart - Employee growth */}
        <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-[#0a0b0d]">
                Tăng trưởng nhân viên
              </h3>
              <p className="text-sm text-[#7c828a] mt-0.5">6 tháng gần nhất</p>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-[#05b169]">
              <ArrowUpRight size={16} />
              +45%
            </div>
          </div>
          <div className="h-[280px]">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        {/* Bar chart - Leave requests */}
        <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-[#0a0b0d]">
                Đơn phép theo tháng
              </h3>
              <p className="text-sm text-[#7c828a] mt-0.5">6 tháng gần nhất</p>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-[#0052ff]">
              <ArrowUpRight size={16} />
              Tổng: 128
            </div>
          </div>
          <div className="h-[280px]">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doughnut chart - Department distribution */}
        <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
          <h3 className="text-base font-semibold text-[#0a0b0d] mb-6">
            Phân bổ phòng ban
          </h3>
          <div className="h-[260px]">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#eef0f3] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-[#0a0b0d]">
              Hoạt động gần đây
            </h3>
            <button className="text-sm font-medium text-[#0052ff] hover:text-[#003ecc]">
              Xem tất cả
            </button>
          </div>
          <div className="space-y-1">
            {[
              {
                action: "Nguyễn Văn An đã gửi đơn xin phép",
                time: "2 phút trước",
                color: "#f4b000",
              },
              {
                action: "Trần Minh Quân đã phê duyệt đơn phép",
                time: "15 phút trước",
                color: "#05b169",
              },
              {
                action: "Lê Thị Hương đã cập nhật hồ sơ nhân viên",
                time: "1 giờ trước",
                color: "#0052ff",
              },
              {
                action: "Phạm Đức Minh đã đăng ký nghỉ ốm",
                time: "2 giờ trước",
                color: "#8b5cf6",
              },
              {
                action: "Hệ thống đã gửi thông báo nhắc nhở",
                time: "3 giờ trước",
                color: "#7c828a",
              },
            ].map((activity, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 border-b border-[#eef0f3] last:border-0"
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: activity.color }}
                />
                <span className="flex-1 text-sm text-[#0a0b0d]">
                  {activity.action}
                </span>
                <span className="text-xs text-[#7c828a] shrink-0">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
