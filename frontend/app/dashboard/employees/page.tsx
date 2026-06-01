"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MagnifyingGlass,
  Plus,
  DotsThree,
  Envelope,
  Phone,
  MapPin,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";

const employees = [
  {
    id: "E001",
    name: "Nguyễn Văn An",
    email: "an@example.com",
    role: "employee",
    department: "Engineering",
    position: "Backend Developer",
    status: "active",
    manager: "Trần Minh Quân",
  },
  {
    id: "E002",
    name: "Trần Thị Bình",
    email: "binh@example.com",
    role: "employee",
    department: "Marketing",
    position: "Marketing Specialist",
    status: "active",
    manager: "Lê Thị Hương",
  },
  {
    id: "E003",
    name: "Phạm Đức Minh",
    email: "minh@example.com",
    role: "employee",
    department: "Engineering",
    position: "Frontend Developer",
    status: "active",
    manager: "Trần Minh Quân",
  },
  {
    id: "E004",
    name: "Lê Thị Hương",
    email: "hr@example.com",
    role: "hr_admin",
    department: "Human Resources",
    position: "HR Manager",
    status: "active",
    manager: null,
  },
  {
    id: "E005",
    name: "Hoàng Văn Dũng",
    email: "dung@example.com",
    role: "employee",
    department: "Sales",
    position: "Sales Executive",
    status: "active",
    manager: "Nguyễn Thị Mai",
  },
  {
    id: "E006",
    name: "Nguyễn Thị Mai",
    email: "mai@example.com",
    role: "manager",
    department: "Sales",
    position: "Sales Manager",
    status: "active",
    manager: null,
  },
  {
    id: "E007",
    name: "Trần Minh Quân",
    email: "manager@example.com",
    role: "manager",
    department: "Engineering",
    position: "Engineering Manager",
    status: "active",
    manager: null,
  },
  {
    id: "E008",
    name: "Vũ Thị Hoa",
    email: "hoa@example.com",
    role: "employee",
    department: "Finance",
    position: "Accountant",
    status: "inactive",
    manager: "Lê Thị Hương",
  },
];

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
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");

  const departments = [
    "all",
    ...Array.from(new Set(employees.map((e) => e.department))),
  ];

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "all" || e.department === filterDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Filters */}
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

      {/* Employee grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((emp) => (
          <div
            key={emp.id}
            className="rounded-2xl bg-white border border-[#eef0f3] p-5 hover:border-[#dee1e6] transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <img
                src={getDicebearAvatar(emp.email)}
                alt={emp.name}
                className="h-12 w-12 rounded-full bg-[#f7f7f7]"
              />
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7c828a] hover:bg-[#f7f7f7]">
                <DotsThree size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0a0b0d]">
                  {emp.name}
                </h3>
                <p className="text-xs text-[#7c828a]">{emp.position}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: roleColors[emp.role].bg,
                    color: roleColors[emp.role].text,
                  }}
                >
                  {emp.role}
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: statusColors[emp.status].bg,
                    color: statusColors[emp.status].text,
                  }}
                >
                  {emp.status}
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
