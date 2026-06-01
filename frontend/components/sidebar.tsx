"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Buildings,
  House,
  Users,
  CalendarBlank,
  ChatCircleText,
  Gear,
  SignOut,
  ListChecks,
  ChartLineUp,
} from "phosphor-react";

const navItems = [
  { href: "/dashboard", icon: House, label: "Tổng quan" },
  { href: "/dashboard/employees", icon: Users, label: "Nhân viên" },
  { href: "/dashboard/leave", icon: CalendarBlank, label: "Phép năm" },
  { href: "/dashboard/tasks", icon: ListChecks, label: "Công việc" },
  { href: "/dashboard/chat", icon: ChatCircleText, label: "AI Chat" },
  { href: "/dashboard/reports", icon: ChartLineUp, label: "Báo cáo" },
];

const bottomItems = [
  { href: "/dashboard/settings", icon: Gear, label: "Cài đặt" },
];

interface SidebarProps {
  user: {
    full_name: string;
    role: string;
    department: string;
  };
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 flex w-[260px] flex-col bg-[#0a0b0d] text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-[#16181c]">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0052ff]">
          <Buildings size={16} className="text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight">Crewwise</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-[#16181c] text-white"
                : "text-[#a8acb3] hover:text-white hover:bg-[#16181c]/50"
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col gap-1 p-3 border-t border-[#16181c]">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-[#16181c] text-white"
                : "text-[#a8acb3] hover:text-white hover:bg-[#16181c]/50"
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}

        {/* User info & logout */}
        <div className="mt-2 pt-3 border-t border-[#16181c]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0052ff] text-xs font-semibold">
              {user.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-[#7c828a] truncate">{user.department}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#a8acb3] hover:text-white hover:bg-[#16181c]/50 transition-colors"
          >
            <SignOut size={20} />
            Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
}
