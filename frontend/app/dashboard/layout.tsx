"use client";

import { useState, createContext, useContext } from "react";
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

  // If no user, redirect to login
  if (!user) {
    // Check localStorage for user data
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("crewwise_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          return null;
        } catch {
          router.push("/login");
          return null;
        }
      } else {
        router.push("/login");
        return null;
      }
    }
    return null;
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
