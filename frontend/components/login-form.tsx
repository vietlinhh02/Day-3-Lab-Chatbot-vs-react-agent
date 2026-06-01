"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Envelope, Lock, Eye, EyeSlash, ArrowRight } from "phosphor-react";
import { toast } from "sonner";
import { login, LoginResponse } from "@/lib/api";

interface LoginFormProps {
  onLoginSuccess: (user: LoginResponse) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await login(email, password);
      toast.success("Đăng nhập thành công!", {
        description: `Chào mừng ${user.full_name}`,
      });
      onLoginSuccess(user);
    } catch (error) {
      toast.error("Đăng nhập thất bại", {
        description: error instanceof Error ? error.message : "Lỗi không xác định",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-[#0a0b0d]">
            Email
          </Label>
          <div className="relative">
            <Envelope
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7c828a]"
              size={18}
            />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11 h-12 rounded-xl border-[#dee1e6] bg-white text-base focus-visible:border-[#0052ff] focus-visible:ring-0"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-[#0a0b0d]">
              Mật khẩu
            </Label>
            <button
              type="button"
              className="text-sm font-medium text-[#0052ff] hover:text-[#003ecc]"
            >
              Quên mật khẩu?
            </button>
          </div>
          <div className="relative">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7c828a]"
              size={18}
            />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11 pr-11 h-12 rounded-xl border-[#dee1e6] bg-white text-base focus-visible:border-[#0052ff] focus-visible:ring-0"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7c828a] hover:text-[#0a0b0d]"
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-full bg-[#0052ff] text-white font-semibold text-base hover:bg-[#003ecc] transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Đang đăng nhập...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Đăng nhập
              <ArrowRight size={18} />
            </span>
          )}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-[#eef0f3]">
        <p className="text-xs text-center text-[#7c828a] mb-3 font-medium uppercase tracking-wider">
          Demo accounts
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Nhân viên", email: "an@example.com" },
            { label: "Quản lý", email: "manager@example.com" },
            { label: "HR", email: "hr@example.com" },
          ].map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword("password123");
              }}
              className="rounded-full bg-[#eef0f3] px-3 py-2 text-xs font-medium text-[#0a0b0d] hover:bg-[#dee1e6] transition-colors"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
