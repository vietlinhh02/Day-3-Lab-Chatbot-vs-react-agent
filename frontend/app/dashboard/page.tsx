"use client";

import { useState, useEffect } from "react";
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
import {
  getDashboardStats,
  getRecentActivities,
  DashboardStats,
  Activity,
} from "@/lib/api";

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

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
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
      grid: { display: false },
      border: { display: false },
      ticks: { color: "#7c828a", font: { size: 12 } },
    },
    y: {
      grid: { color: "#eef0f3" },
      border: { display: false },
      ticks: { color: "#7c828a", font: { size: 12 } },
    },
  },
};

export default function DashboardPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsData, activitiesData] = await Promise.all([
        getDashboardStats(),
        getRecentActivities(),
      ]);
      setStats(statsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0052ff] border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Tổng nhân viên",
      value: stats.total_employees.toString(),
      icon: Users,
      change: "+12%",
      changeType: "up" as const,
      color: "#0052ff",
      bgColor: "#eef4ff",
    },
    {
      label: "Đơn phép chờ duyệt",
      value: stats.pending_leaves.toString(),
      icon: CalendarBlank,
      change: "-3%",
      changeType: "down" as const,
      color: "#f4b000",
      bgColor: "#fef9e7",
    },
    {
      label: "Tổng công việc",
      value: stats.total_tasks.toString(),
      icon: ChatCircleText,
      change: "+28%",
      changeType: "up" as const,
      color: "#05b169",
      bgColor: "#edfaf3",
    },
    {
      label: "Hoàn thành",
      value: stats.done_tasks.toString(),
      icon: TrendUp,
      change: "+5%",
      changeType: "up" as const,
      color: "#8b5cf6",
      bgColor: "#f3f0ff",
    },
  ];

  const departments = Object.entries(stats.departments);
  const deptLabels = departments.map(([d]) => d);
  const deptData = departments.map(([, c]) => c);

  const lineChartData = {
    labels: ["T1", "T2", "T3", "T4", "T5", "T6"],
    datasets: [
      {
        label: "Nhân viên mới",
        data: [12, 19, 15, 25, 22, stats.total_employees],
        borderColor: "#0052ff",
        backgroundColor: "rgba(0, 82, 255, 0.08)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const leaveByStatus = Object.entries(stats.leave_by_status || {});
  const barChartData = {
    labels: leaveByStatus.map(([s]) =>
      s === "submitted"
        ? "Chờ duyệt"
        : s === "approved"
        ? "Đã duyệt"
        : s === "rejected"
        ? "Từ chối"
        : s
    ),
    datasets: [
      {
        label: "Đơn phép",
        data: leaveByStatus.map(([, c]) => c),
        backgroundColor: "#0052ff",
        borderRadius: 8,
        barThickness: 32,
      },
    ],
  };

  const doughnutData = {
    labels: deptLabels,
    datasets: [
      {
        data: deptData,
        backgroundColor: [
          "#0052ff",
          "#05b169",
          "#f4b000",
          "#8b5cf6",
          "#cf202f",
        ],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#0a0b0d] tracking-tight">
          Xin chào, {user.full_name}!
        </h2>
        <p className="text-[#5b616e] mt-1">
          Đây là tổng quan hệ thống quản lý nhân sự hôm nay.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-[#0a0b0d]">
                Tăng trưởng nhân viên
              </h3>
              <p className="text-sm text-[#7c828a] mt-0.5">6 tháng gần nhất</p>
            </div>
          </div>
          <div className="h-[280px]">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-[#0a0b0d]">
                Đơn phép theo trạng thái
              </h3>
            </div>
          </div>
          <div className="h-[280px]">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
          <h3 className="text-base font-semibold text-[#0a0b0d] mb-6">
            Phân bổ phòng ban
          </h3>
          <div className="h-[260px]">
            <Doughnut
              data={doughnutData}
              options={{
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
                      font: { size: 12 },
                    },
                  },
                  tooltip: chartOptions.plugins.tooltip,
                },
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#eef0f3] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-[#0a0b0d]">
              Hoạt động gần đây
            </h3>
          </div>
          <div className="space-y-1">
            {activities.length > 0 ? (
              activities.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3 border-b border-[#eef0f3] last:border-0"
                >
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        activity.type === "leave" ? "#f4b000" : "#0052ff",
                    }}
                  />
                  <span className="flex-1 text-sm text-[#0a0b0d]">
                    {activity.action}
                  </span>
                  <span className="text-xs text-[#7c828a] shrink-0">
                    {activity.employee_id}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#7c828a] text-center py-4">
                Chưa có hoạt động nào
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
