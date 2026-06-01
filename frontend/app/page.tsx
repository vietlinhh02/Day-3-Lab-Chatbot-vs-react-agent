"use client";

import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { User, Shield, Buildings } from "phosphor-react";

export default function LoginPage() {
  const [user, setUser] = useState<{
    employee_id: string;
    full_name: string;
    email: string;
    role: string;
    department: string;
    position: string;
  } | null>(null);

  const handleLoginSuccess = (userData: {
    employee_id: string;
    full_name: string;
    email: string;
    role: string;
    department: string;
    position: string;
  }) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ed] p-4">
        <Card className="w-full max-w-md border-[#eceae4] bg-[#f7f4ed] shadow-none">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1c1c1c] text-[#fcfbf8]">
                {user.role === "employee" && <User size={32} />}
                {user.role === "manager" && <Buildings size={32} />}
                {user.role === "hr_admin" && <Shield size={32} />}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#1c1c1c]">
                  Xin chào, {user.full_name}!
                </h2>
                <p className="text-sm text-[#5f5f5d]">{user.email}</p>
              </div>
              <div className="rounded-lg border border-[#eceae4] bg-white p-4 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5d]">Mã nhân viên:</span>
                    <span className="font-medium text-[#1c1c1c]">{user.employee_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5d]">Vai trò:</span>
                    <span className="font-medium text-[#1c1c1c]">{user.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5d]">Phòng ban:</span>
                    <span className="font-medium text-[#1c1c1c]">{user.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5d]">Chức vụ:</span>
                    <span className="font-medium text-[#1c1c1c]">{user.position}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full rounded-md border border-[rgba(28,28,28,0.4)] bg-transparent px-4 py-2 text-sm font-medium text-[#1c1c1c] hover:bg-[rgba(28,28,28,0.04)] transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f4ed] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1c1c1c]">
            HR Management System
          </h1>
          <p className="mt-2 text-sm text-[#5f5f5d]">
            Hệ thống quản lý nhân sự
          </p>
        </div>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
}
