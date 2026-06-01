"use client";

import { Bell, MagnifyingGlass } from "phosphor-react";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  title: string;
  user: {
    full_name: string;
    role: string;
  };
}

export function Header({ title, user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#eef0f3] bg-white/80 backdrop-blur-sm px-8">
      <h1 className="text-lg font-semibold text-[#0a0b0d] tracking-tight">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7c828a]"
            size={16}
          />
          <Input
            placeholder="Tìm kiếm..."
            className="pl-9 h-9 rounded-full bg-[#f7f7f7] border-0 text-sm focus-visible:ring-0"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f7f7] text-[#5b616e] hover:text-[#0a0b0d] transition-colors">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#0052ff]" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0052ff] text-xs font-semibold text-white">
            {user.full_name.charAt(0)}
          </div>
          <span className="text-sm font-medium text-[#0a0b0d]">
            {user.full_name}
          </span>
        </div>
      </div>
    </header>
  );
}
