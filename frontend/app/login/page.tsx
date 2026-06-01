"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { PublicHeader } from "@/components/public-header";
import { Buildings } from "phosphor-react";

export default function LoginPage() {
  const router = useRouter();
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
    localStorage.setItem("crewwise_user", JSON.stringify(userData));
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] p-4">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0052ff] text-white">
            <Buildings size={28} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#0a0b0d]">
              Xin chào, {user.full_name}!
            </h2>
            <p className="text-sm text-[#5b616e] mt-1">
              Đăng nhập thành công. Đang chuyển hướng...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <div className="flex flex-1">
        {/* Left - Dark Hero */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#0a0b0d] text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
            {/* Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1
                  className="text-5xl xl:text-6xl font-medium tracking-tight leading-[1.05]"
                  style={{ fontFamily: "var(--font-inter-tight)" }}
                >
                  Quản lý
                  <br />
                  nhân sự
                  <br />
                  <span className="text-[#0052ff]">thông minh</span>
                </h1>
                <p className="text-lg text-[#a8acb3] max-w-md">
                  Hệ thống quản lý nhân sự toàn diện với AI assistant cho doanh
                  nghiệp hiện đại.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-3">
                {["Quản lý nhân sự", "Phân quyền", "AI Chat", "Báo cáo"].map(
                  (f) => (
                    <div
                      key={f}
                      className="flex items-center rounded-full bg-[#16181c] px-4 py-2.5"
                    >
                      <span className="text-sm font-medium text-white">
                        {f}
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-12 pt-4">
                <div>
                  <p
                    className="text-3xl font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-inter-tight)" }}
                  >
                    500+
                  </p>
                  <p className="text-sm text-[#a8acb3]">Nhân viên</p>
                </div>
                <div>
                  <p
                    className="text-3xl font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-inter-tight)" }}
                  >
                    50+
                  </p>
                  <p className="text-sm text-[#a8acb3]">Phòng ban</p>
                </div>
                <div>
                  <p
                    className="text-3xl font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-inter-tight)" }}
                  >
                    99%
                  </p>
                  <p className="text-sm text-[#a8acb3]">Hài lòng</p>
                </div>
              </div>
            </div>

            {/* Bottom */}
            <p className="text-xs text-[#5b616e]">
              © 2026 Crewwise. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right - Login Form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center bg-white p-8">
          <div className="w-full max-w-[400px] space-y-8">
            {/* Mobile logo */}
            <div className="lg:hidden text-center space-y-2">
              <h2
                className="text-2xl font-semibold tracking-tight text-[#0a0b0d]"
                style={{ fontFamily: "var(--font-manrope)" }}
              >
                Đăng nhập
              </h2>
              <p className="text-[#5b616e]">
                Chào mừng trở lại! Vui lòng nhập thông tin.
              </p>
            </div>

            {/* Desktop title */}
            <div className="hidden lg:block space-y-2">
              <h2
                className="text-2xl font-semibold tracking-tight text-[#0a0b0d]"
                style={{ fontFamily: "var(--font-manrope)" }}
              >
                Đăng nhập
              </h2>
              <p className="text-[#5b616e]">
                Chào mừng trở lại! Vui lòng nhập thông tin.
              </p>
            </div>

            <LoginForm onLoginSuccess={handleLoginSuccess} />

            <p className="text-center text-xs text-[#7c828a]">
              Chưa có tài khoản?{" "}
              <button className="font-medium text-[#0052ff] hover:text-[#003ecc]">
                Liên hệ HR
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
