"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MagnifyingGlass,
  Plus,
  DotsThree,
  Envelope,
  MapPin,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";
import { getEmployees, Employee } from "@/lib/api";

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: "#edfaf3", text: "#05b169" },
  inactive: { bg: "#f7f7f7", text: "#7c828a" },
};

const roleColors: Record<string, { bg: string; text: string }> = {
  employee: { bg: "#eef4ff", text: "#0052ff" },
  manager: { bg: "#f3f0ff", text: "#8b5cf6" },
  hr_admin: { bg: "#fef9e7", text: "#f4b000" },
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error("Failed to load employees:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const departments = [
    "all",
    ...Array.from(new Set(employees.map((e) => e.department))),
  ];

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "all" || e.department === filterDept;
    return matchSearch && matchDept;
  });

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
            Nhân viên
          </h2>
          <p className="text-[#5b616e] mt-1">
            Quản lý hồ sơ nhân viên trong hệ thống
          </p>
        </div>
        <Button className="rounded-full bg-[#0052ff] text-white font-semibold hover:bg-[#003ecc]">
          <Plus size={18} className="mr-1" />
          Thêm nhân viên
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7c828a]"
            size={16}
          />
          <Input
            placeholder="Tìm kiếm nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl border-[#dee1e6] bg-white"
          />
        </div>
        <div className="flex gap-2">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setFilterDept(dept)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filterDept === dept
                  ? "bg-[#0a0b0d] text-white"
                  : "bg-white text-[#5b616e] border border-[#dee1e6] hover:border-[#0a0b0d]"
              }`}
            >
              {dept === "all" ? "Tất cả" : dept}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((emp) => (
          <div
            key={emp.employee_id}
            className="rounded-2xl bg-white border border-[#eef0f3] p-5 hover:border-[#dee1e6] transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <img
                src={getDicebearAvatar(emp.email)}
                alt={emp.full_name}
                className="h-12 w-12 rounded-full bg-[#f7f7f7]"
              />
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7c828a] hover:bg-[#f7f7f7]">
                <DotsThree size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0a0b0d]">
                  {emp.full_name}
                </h3>
                <p className="text-xs text-[#7c828a]">{emp.position}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: roleColors[emp.role]?.bg || "#f7f7f7",
                    color: roleColors[emp.role]?.text || "#7c828a",
                  }}
                >
                  {emp.role}
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: statusColors[emp.employment_status]?.bg || "#f7f7f7",
                    color: statusColors[emp.employment_status]?.text || "#7c828a",
                  }}
                >
                  {emp.employment_status}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#eef0f3]">
                <div className="flex items-center gap-2 text-xs text-[#5b616e]">
                  <Envelope size={14} />
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#5b616e]">
                  <MapPin size={14} />
                  <span>{emp.department}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
