"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PaperPlaneRight,
  Sparkle,
  User,
  Clock,
  Plus,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";

const mockMessages = [
  {
    id: 1,
    role: "user" as const,
    content:
      "Tôi bị sốt cao, muốn xin nghỉ thứ 2 và thứ 3 tuần tới. Công ty có yêu cầu giấy khám bệnh không?",
    time: "10:30",
  },
  {
    id: 2,
    role: "assistant" as const,
    content: `Theo quy định, vì bạn xin nghỉ 2 ngày nên cần nộp bổ sung giấy khám bệnh để hưởng nguyên lương.

Bạn hiện còn **5 ngày phép ốm** và **4 ngày phép năm**.

Bạn có muốn mình tạo luôn đơn xin nghỉ ốm cho thứ 2 và thứ 3 tuần tới không?`,
    time: "10:30",
    thought: "Tìm thấy quy định nghỉ ốm trong sổ tay nhân sự",
    tool: "Search_HR_Policy",
  },
  {
    id: 3,
    role: "user" as const,
    content: "Có, tạo giúp tôi.",
    time: "10:31",
  },
  {
    id: 4,
    role: "assistant" as const,
    content: `Mình đã tạo xong đơn xin nghỉ ốm cho bạn.

**Mã đơn:** LR-1024
**Loại nghỉ:** Nghỉ ốm
**Thời gian:** 08/06/2026 - 09/06/2026
**Trạng thái:** Chờ duyệt

Đơn đã được gửi đến quản lý trực tiếp. Chúc bạn mau khỏe!`,
    time: "10:31",
    thought: "Người dùng đã xác nhận, tạo đơn xin nghỉ",
    tool: "Create_Leave_Request",
  },
];

const quickActions = [
  "Xem số ngày phép còn lại",
  "Tạo đơn xin nghỉ phép",
  "Chính sách nghỉ ốm",
  "Xem đơn của tôi",
];

export default function ChatPage() {
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = {
      id: messages.length + 1,
      role: "user" as const,
      content: input,
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([...messages, newMsg]);
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-128px)] gap-6">
      {/* Chat area */}
      <div className="flex-1 flex flex-col rounded-2xl bg-white border border-[#eef0f3] overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0052ff]">
                  <Sparkle size={16} className="text-white" />
                </div>
              )}

              <div
                className={`max-w-[70%] space-y-2 ${
                  msg.role === "user" ? "order-first" : ""
                }`}
              >
                {msg.tool && (
                  <div className="flex items-center gap-2 text-xs text-[#7c828a]">
                    <Clock size={12} />
                    <span className="font-mono bg-[#f7f7f7] px-2 py-0.5 rounded">
                      {msg.tool}
                    </span>
                  </div>
                )}

                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#0052ff] text-white rounded-br-md"
                      : "bg-[#f7f7f7] text-[#0a0b0d] rounded-bl-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>

                <p
                  className={`text-xs text-[#7c828a] ${
                    msg.role === "user" ? "text-right" : ""
                  }`}
                >
                  {msg.time}
                </p>
              </div>

              {msg.role === "user" && (
                <img
                  src={getDicebearAvatar("an@example.com")}
                  alt="User"
                  className="h-8 w-8 shrink-0 rounded-full bg-[#f7f7f7]"
                />
              )}
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="px-6 py-3 border-t border-[#eef0f3]">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => setInput(action)}
                className="shrink-0 rounded-full bg-[#f7f7f7] px-4 py-2 text-xs font-medium text-[#5b616e] hover:bg-[#eef0f3] transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#eef0f3]">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 h-11 rounded-xl border-[#dee1e6] bg-white"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button
              onClick={handleSend}
              className="h-11 w-11 rounded-xl bg-[#0052ff] hover:bg-[#003ecc] p-0"
            >
              <PaperPlaneRight size={18} className="text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="hidden lg:flex w-80 flex-col gap-4">
        {/* New chat */}
        <Button
          variant="outline"
          className="w-full rounded-xl h-11 border-[#dee1e6] text-[#0a0b0d] font-medium"
        >
          <Plus size={18} className="mr-2" />
          Cuộc trò chuyện mới
        </Button>

        {/* History */}
        <div className="flex-1 rounded-2xl bg-white border border-[#eef0f3] p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-[#0a0b0d] mb-4">
            Lịch sử trò chuyện
          </h3>
          <div className="space-y-2">
            {[
              { title: "Xin nghỉ ốm tuần tới", time: "Hôm nay" },
              { title: "Kiểm tra ngày phép", time: "Hôm qua" },
              { title: "Chính sách nghỉ lễ", time: "2 ngày trước" },
              { title: "Tạo đơn xin nghỉ", time: "1 tuần trước" },
            ].map((chat, i) => (
              <button
                key={i}
                className={`w-full text-left rounded-xl p-3 transition-colors ${
                  i === 0
                    ? "bg-[#eef4ff] border border-[#0052ff]/20"
                    : "hover:bg-[#f7f7f7]"
                }`}
              >
                <p className="text-sm font-medium text-[#0a0b0d] truncate">
                  {chat.title}
                </p>
                <p className="text-xs text-[#7c828a] mt-0.5">{chat.time}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
