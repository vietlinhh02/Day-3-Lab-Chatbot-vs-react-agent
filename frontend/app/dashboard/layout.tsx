"use client";

import { useState, createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

interface UserContextType {
  user: {
    employee_id: string;
    full_name: string;
    email: string;
    role: string;
    department: string;
    position: string;
  };
}

const UserContext = createContext<UserContextType | null>(null);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within DashboardLayout");
  }
  return context;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{
    employee_id: string;
    full_name: string;
    email: string;
    role: string;
    department: string;
    position: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("crewwise_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0052ff] border-t-transparent" />
          <p className="text-sm text-[#5b616e]">Đang tải...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("crewwise_user");
    router.push("/login");
  };

  const getPageTitle = () => {
    if (typeof window === "undefined") return "Tổng quan";
    const path = window.location.pathname;
    if (path === "/dashboard") return "Tổng quan";
    if (path.includes("/employees")) return "Nhân viên";
    if (path.includes("/leave")) return "Phép năm";
    if (path.includes("/tasks")) return "Công việc";
    if (path.includes("/chat")) return "AI Chat";
    if (path.includes("/reports")) return "Báo cáo";
    if (path.includes("/settings")) return "Cài đặt";
    return "Tổng quan";
  };

  return (
    <UserContext.Provider value={{ user }}>
      <div className="flex min-h-screen bg-[#f7f7f7]">
        <Sidebar user={user} onLogout={handleLogout} />
        <div className="flex-1 ml-[260px]">
          <Header title={getPageTitle()} user={user} />
          <main className="p-8">{children}</main>
        </div>
      </div>
    </UserContext.Provider>
  );
}
