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
  Sidebar as SidebarIcon,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";

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
    email: string;
    role: string;
    department: string;
  };
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ user, onLogout, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const avatarUrl = getDicebearAvatar(user.email);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-[#0a0b0d] text-white ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
      style={{ transition: "width 200ms ease-in-out" }}
    >
      {/* Logo & Toggle */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-[#16181c]">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0052ff]">
              <Buildings size={16} className="text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              Crewwise
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-[#a8acb3] hover:text-white hover:bg-[#16181c] transition-colors ${
            collapsed ? "mx-auto" : ""
          }`}
        >
          <SidebarIcon size={18} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-xl transition-colors ${
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
            } ${
              isActive(item.href)
                ? "bg-[#16181c] text-white"
                : "text-[#a8acb3] hover:text-white hover:bg-[#16181c]/50"
            }`}
          >
            <item.icon size={20} />
            {!collapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col gap-1 p-3 border-t border-[#16181c]">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-xl transition-colors ${
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
            } ${
              isActive(item.href)
                ? "bg-[#16181c] text-white"
                : "text-[#a8acb3] hover:text-white hover:bg-[#16181c]/50"
            }`}
          >
            <item.icon size={20} />
            {!collapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </Link>
        ))}

        {/* User info & logout */}
        <div className="mt-2 pt-3 border-t border-[#16181c]">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2">
                <img
                  src={avatarUrl}
                  alt={user.full_name}
                  className="h-8 w-8 rounded-full bg-[#16181c]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-[#7c828a] truncate">
                    {user.department}
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#a8acb3] hover:text-white hover:bg-[#16181c]/50 transition-colors"
              >
                <SignOut size={20} />
                Đăng xuất
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <img
                src={avatarUrl}
                alt={user.full_name}
                className="h-8 w-8 rounded-full bg-[#16181c]"
              />
              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#a8acb3] hover:text-white hover:bg-[#16181c] transition-colors"
              >
                <SignOut size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
