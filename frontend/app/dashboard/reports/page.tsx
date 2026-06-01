"use client";

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
import { TrendUp, Users, CalendarBlank, Clock } from "phosphor-react";

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

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0a0b0d] tracking-tight">
          Báo cáo
        </h2>
        <p className="text-[#5b616e] mt-1">
          Thống kê và phân tích dữ liệu nhân sự
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Tổng nhân viên",
            value: "128",
            change: "+12%",
            icon: Users,
            color: "#0052ff",
          },
          {
            label: "Nghỉ phép tháng này",
            value: "45",
            change: "-8%",
            icon: CalendarBlank,
            color: "#f4b000",
          },
          {
            label: "Tỷ lệ đi làm",
            value: "94%",
            change: "+2%",
            icon: TrendUp,
            color: "#05b169",
          },
          {
            label: "Thời gian duyệt TB",
            value: "1.2d",
            change: "-15%",
            icon: Clock,
            color: "#8b5cf6",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-white border border-[#eef0f3] p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: stat.color + "15" }}
              >
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <span className="text-xs font-medium text-[#7c828a]">
                {stat.label}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span
                className="text-2xl font-semibold text-[#0a0b0d]"
                style={{ fontFamily: "var(--font-inter-tight)" }}
              >
                {stat.value}
              </span>
              <span className="text-xs font-medium text-[#05b169]">
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount trend */}
        <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
          <h3 className="text-base font-semibold text-[#0a0b0d] mb-6">
            Biến động nhân sự
          </h3>
          <div className="h-[300px]">
            <Line
              data={{
                labels: ["T1", "T2", "T3", "T4", "T5", "T6"],
                datasets: [
                  {
                    label: "Tuyển mới",
                    data: [8, 12, 6, 15, 10, 14],
                    borderColor: "#0052ff",
                    backgroundColor: "rgba(0, 82, 255, 0.08)",
                    fill: true,
                    tension: 0.4,
                  },
                  {
                    label: "Nghỉ việc",
                    data: [3, 2, 4, 1, 3, 2],
                    borderColor: "#cf202f",
                    backgroundColor: "rgba(207, 32, 47, 0.08)",
                    fill: true,
                    tension: 0.4,
                  },
                ],
              }}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    display: true,
                    position: "top" as const,
                    align: "end" as const,
                    labels: {
                      usePointStyle: true,
                      pointStyle: "circle",
                      padding: 16,
                      color: "#5b616e",
                      font: { size: 12 },
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Leave by department */}
        <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
          <h3 className="text-base font-semibold text-[#0a0b0d] mb-6">
            Nghỉ phép theo phòng ban
          </h3>
          <div className="h-[300px]">
            <Bar
              data={{
                labels: [
                  "Engineering",
                  "Marketing",
                  "Sales",
                  "HR",
                  "Finance",
                ],
                datasets: [
                  {
                    label: "Số ngày nghỉ",
                    data: [45, 32, 28, 15, 20],
                    backgroundColor: [
                      "#0052ff",
                      "#05b169",
                      "#f4b000",
                      "#8b5cf6",
                      "#cf202f",
                    ],
                    borderRadius: 8,
                    barThickness: 40,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>

        {/* Department distribution */}
        <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
          <h3 className="text-base font-semibold text-[#0a0b0d] mb-6">
            Phân bổ nhân sự
          </h3>
          <div className="h-[300px]">
            <Doughnut
              data={{
                labels: [
                  "Engineering",
                  "Marketing",
                  "Sales",
                  "HR",
                  "Finance",
                ],
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
                  },
                ],
              }}
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

        {/* Chat usage */}
        <div className="rounded-2xl bg-white border border-[#eef0f3] p-6">
          <h3 className="text-base font-semibold text-[#0a0b0d] mb-6">
            Lượt sử dụng AI Chat
          </h3>
          <div className="h-[300px]">
            <Line
              data={{
                labels: [
                  "T2",
                  "T3",
                  "T4",
                  "T5",
                  "T6",
                  "T7",
                  "CN",
                ],
                datasets: [
                  {
                    label: "Cuộc trò chuyện",
                    data: [45, 52, 38, 65, 48, 30, 15],
                    borderColor: "#8b5cf6",
                    backgroundColor: "rgba(139, 92, 246, 0.08)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
