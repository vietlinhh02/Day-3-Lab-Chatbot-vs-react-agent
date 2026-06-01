"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Envelope, Lock, Eye, EyeSlash } from "phosphor-react";
import employeesData from "@/data/employees.json";

interface LoginFormProps {
  onLoginSuccess: (user: {
    employee_id: string;
    full_name: string;
    email: string;
    role: string;
    department: string;
    position: string;
  }) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const user = employeesData.employees.find(
        (emp) => emp.email === email && emp.password === password
      );

      if (user) {
        onLoginSuccess({
          employee_id: user.employee_id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          department: user.department,
          position: user.position,
        });
      } else {
        setError("Email hoặc mật khẩu không đúng");
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <Card className="w-full max-w-md border-[#eceae4] bg-[#f7f4ed] shadow-none">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">
          Đăng nhập
        </CardTitle>
        <CardDescription className="text-sm text-[#5f5f5d]">
          Nhập thông tin đăng nhập để truy cập hệ thống
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-[#1c1c1c]">
              Email
            </Label>
            <div className="relative">
              <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f5f5d]" size={18} />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 border-[#eceae4] bg-white focus-visible:ring-[rgba(59,130,246,0.5)]"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-[#1c1c1c]">
              Mật khẩu
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f5f5d]" size={18} />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 border-[#eceae4] bg-white focus-visible:ring-[rgba(59,130,246,0.5)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors"
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#1c1c1c] text-[#fcfbf8] hover:bg-[#1c1c1c]/90 shadow-[rgba(255,255,255,0.2)_0px_0.5px_0px_0px_inset,rgba(0,0,0,0.2)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.05)_0px_1px_2px_0px]"
          >
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-[#5f5f5d]">
          <p>Demo accounts:</p>
          <p className="mt-1 font-mono text-xs">
            employee: an@example.com / password123
          </p>
          <p className="font-mono text-xs">
            manager: manager@example.com / password123
          </p>
          <p className="font-mono text-xs">
            hr_admin: hr@example.com / password123
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
