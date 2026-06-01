"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Check,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";
import { toast } from "sonner";

const sections = [
  { id: "profile", label: "Hồ sơ", icon: User },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "security", label: "Bảo mật", icon: Shield },
  { id: "appearance", label: "Giao diện", icon: Palette },
  { id: "language", label: "Ngôn ngữ", icon: Globe },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");

  const handleSave = () => {
    toast.success("Đã lưu cài đặt thành công!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0a0b0d] tracking-tight">
          Cài đặt
        </h2>
        <p className="text-[#5b616e] mt-1">
          Quản lý tùy chỉnh tài khoản và hệ thống
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-[#0a0b0d] text-white"
                    : "text-[#5b616e] hover:bg-[#f7f7f7]"
                }`}
              >
                <section.icon size={18} />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-2xl bg-white border border-[#eef0f3] p-6">
          {activeSection === "profile" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#0a0b0d]">
                  Hồ sơ cá nhân
                </h3>
                <p className="text-sm text-[#5b616e] mt-1">
                  Cập nhật thông tin cá nhân của bạn
                </p>
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={getDicebearAvatar("an@example.com")}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full bg-[#f7f7f7]"
                />
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-[#dee1e6]"
                  >
                    Thay đổi ảnh
                  </Button>
                  <p className="text-xs text-[#7c828a] mt-1">
                    JPG, PNG. Tối đa 2MB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-[#0a0b0d]">Họ và tên</Label>
                  <Input
                    defaultValue="Nguyễn Văn An"
                    className="h-10 rounded-lg border-[#dee1e6]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-[#0a0b0d]">Email</Label>
                  <Input
                    defaultValue="an@example.com"
                    className="h-10 rounded-lg border-[#dee1e6]"
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-[#0a0b0d]">Phòng ban</Label>
                  <Input
                    defaultValue="Engineering"
                    className="h-10 rounded-lg border-[#dee1e6]"
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-[#0a0b0d]">Chức vụ</Label>
                  <Input
                    defaultValue="Backend Developer"
                    className="h-10 rounded-lg border-[#dee1e6]"
                    disabled
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  className="rounded-full bg-[#0052ff] text-white font-semibold hover:bg-[#003ecc]"
                >
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#0a0b0d]">
                  Cài đặt thông báo
                </h3>
                <p className="text-sm text-[#5b616e] mt-1">
                  Quản lý cách bạn nhận thông báo
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    label: "Thông báo đơn phép",
                    desc: "Nhận thông báo khi đơn được duyệt/từ chối",
                    enabled: true,
                  },
                  {
                    label: "Nhắc nhở phép năm",
                    desc: "Nhắc khi số ngày phép sắp hết",
                    enabled: true,
                  },
                  {
                    label: "Cập nhật hệ thống",
                    desc: "Thông báo khi có thay đổi chính sách",
                    enabled: false,
                  },
                  {
                    label: "Email tổng hợp",
                    desc: "Nhận báo cáo hàng tuần qua email",
                    enabled: false,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-4 rounded-xl border border-[#eef0f3]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#0a0b0d]">
                        {item.label}
                      </p>
                      <p className="text-xs text-[#7c828a]">{item.desc}</p>
                    </div>
                    <button
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        item.enabled ? "bg-[#0052ff]" : "bg-[#dee1e6]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          item.enabled ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#0a0b0d]">
                  Bảo mật
                </h3>
                <p className="text-sm text-[#5b616e] mt-1">
                  Quản lý mật khẩu và xác thực
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[#eef0f3]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#0a0b0d]">
                        Mật khẩu
                      </p>
                      <p className="text-xs text-[#7c828a]">
                        Cập nhật lần cuối: 30 ngày trước
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-[#dee1e6]"
                    >
                      Đổi mật khẩu
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#eef0f3]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#0a0b0d]">
                        Xác thực 2 yếu tố
                      </p>
                      <p className="text-xs text-[#7c828a]">
                        Bảo vệ tài khoản bằng lớp xác thực bổ sung
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edfaf3] px-3 py-1 text-xs font-semibold text-[#05b169]">
                      <Check size={12} />
                      Đã bật
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#0a0b0d]">
                  Giao diện
                </h3>
                <p className="text-sm text-[#5b616e] mt-1">
                  Tùy chỉnh giao diện hệ thống
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-[#0a0b0d] mb-3 block">
                    Chủ đề
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Sáng", active: true },
                      { label: "Tối", active: false },
                      { label: "Hệ thống", active: false },
                    ].map((theme) => (
                      <button
                        key={theme.label}
                        className={`rounded-xl p-4 text-center text-sm font-medium transition-colors ${
                          theme.active
                            ? "bg-[#0a0b0d] text-white"
                            : "bg-[#f7f7f7] text-[#5b616e] hover:bg-[#eef0f3]"
                        }`}
                      >
                        {theme.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "language" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#0a0b0d]">
                  Ngôn ngữ
                </h3>
                <p className="text-sm text-[#5b616e] mt-1">
                  Chọn ngôn ngữ hiển thị
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Tiếng Việt", code: "vi", active: true },
                  { label: "English", code: "en", active: false },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    className={`flex w-full items-center justify-between rounded-xl p-4 text-sm font-medium transition-colors ${
                      lang.active
                        ? "bg-[#eef4ff] border border-[#0052ff]/20 text-[#0052ff]"
                        : "bg-[#f7f7f7] text-[#5b616e] hover:bg-[#eef0f3]"
                    }`}
                  >
                    {lang.label}
                    {lang.active && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
