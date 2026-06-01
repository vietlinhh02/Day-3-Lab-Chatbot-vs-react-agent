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
  MagnifyingGlass,
  Trash,
  Archive,
  DotsThree,
  Lightning,
  BookOpen,
  CalendarBlank,
  Users,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  time: string;
  thought?: string;
  tool?: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  time: string;
  unread: number;
}

const conversations: Conversation[] = [
  {
    id: "1",
    title: "Xin nghỉ ốm tuần tới",
    lastMessage: "Mình đã tạo xong đơn xin nghỉ ốm cho bạn...",
    time: "10:31",
    unread: 0,
  },
  {
    id: "2",
    title: "Kiểm tra ngày phép",
    lastMessage: "Bạn hiện còn 4 ngày phép năm và 5 ngày phép ốm.",
    time: "Hôm qua",
    unread: 0,
  },
  {
    id: "3",
    title: "Chính sách nghỉ lễ",
    lastMessage: "Theo sổ tay nhân sự, công ty có 11 ngày nghỉ lễ...",
    time: "2 ngày trước",
    unread: 0,
  },
  {
    id: "4",
    title: "Tạo đơn xin nghỉ",
    lastMessage: "Đơn đã được tạo thành công với mã LR-1020.",
    time: "1 tuần trước",
    unread: 0,
  },
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "user",
    content:
      "Tôi bị sốt cao, muốn xin nghỉ thứ 2 và thứ 3 tuần tới. Công ty có yêu cầu giấy khám bệnh không?",
    time: "10:30",
  },
  {
    id: 2,
    role: "assistant",
    content: `Theo quy định, vì bạn xin nghỉ 2 ngày nên cần nộp bổ sung giấy khám bệnh để hưởng nguyên lương.

Bạn hiện còn **5 ngày phép ốm** và **4 ngày phép năm**.

Bạn có muốn mình tạo luôn đơn xin nghỉ ốm cho thứ 2 và thứ 3 tuần tới không?`,
    time: "10:30",
    thought:
      "Người dùng cần biết quy định nghỉ ốm và số ngày phép còn lại. Trước tiên cần tra cứu sổ tay nhân sự.",
    tool: "Search_HR_Policy",
  },
  {
    id: 3,
    role: "user",
    content: "Có, tạo giúp tôi.",
    time: "10:31",
  },
  {
    id: 4,
    role: "assistant",
    content: `Mình đã tạo xong đơn xin nghỉ ốm cho bạn.

**Mã đơn:** LR-1024
**Loại nghỉ:** Nghỉ ốm
**Thời gian:** 08/06/2026 - 09/06/2026
**Trạng thái:** Chờ duyệt

Đơn đã được gửi đến quản lý trực tiếp. Chúc bạn mau khỏe!`,
    time: "10:31",
    thought: "Người dùng đã xác nhận, tạo đơn xin nghỉ ốm.",
    tool: "Create_Leave_Request",
  },
];

const quickActions = [
  { icon: CalendarBlank, label: "Xin nghỉ phép", prompt: "Tôi muốn tạo đơn xin nghỉ phép" },
  { icon: BookOpen, label: "Chính sách", prompt: "Cho tôi hỏi về chính sách công ty" },
  { icon: Users, label: "Thông tin nhân viên", prompt: "Tìm thông tin nhân viên" },
  { icon: Lightning, label: "Kiểm tra phép", prompt: "Kiểm tra số ngày phép còn lại" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [activeConvo, setActiveConvo] = useState("1");
  const [showThought, setShowThought] = useState<number | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: messages.length + 1,
      role: "user",
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
    <div className="flex h-[calc(100vh-128px)] gap-0 rounded-2xl overflow-hidden border border-[#eef0f3]">
      {/* Conversation list */}
      <div className="w-72 shrink-0 bg-white border-r border-[#eef0f3] flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-[#eef0f3]">
          <div className="relative">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7c828a]"
              size={16}
            />
            <Input
              placeholder="Tìm kiếm..."
              className="pl-9 h-9 rounded-lg bg-[#f7f7f7] border-0 text-sm"
            />
          </div>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full rounded-lg h-10 border-[#dee1e6] text-[#0a0b0d] font-medium text-sm"
          >
            <Plus size={16} className="mr-2" />
            Cuộc trò chuyện mới
          </Button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => setActiveConvo(convo.id)}
              className={`w-full text-left p-4 border-b border-[#eef0f3] transition-colors ${
                activeConvo === convo.id
                  ? "bg-[#eef4ff]"
                  : "hover:bg-[#f7f7f7]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0a0b0d] truncate">
                    {convo.title}
                  </p>
                  <p className="text-xs text-[#7c828a] mt-1 line-clamp-2">
                    {convo.lastMessage}
                  </p>
                </div>
                <span className="text-xs text-[#7c828a] shrink-0">
                  {convo.time}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-[#f7f7f7]">
        {/* Chat header */}
        <div className="h-14 px-6 flex items-center justify-between bg-white border-b border-[#eef0f3]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0052ff]">
              <Sparkle size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0a0b0d]">
                Crewwise AI
              </p>
              <p className="text-xs text-[#05b169]">Đang hoạt động</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7c828a] hover:bg-[#f7f7f7]">
              <Archive size={16} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7c828a] hover:bg-[#f7f7f7]">
              <Trash size={16} />
            </button>
          </div>
        </div>

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
                {/* Tool call indicator */}
                {msg.tool && (
                  <button
                    onClick={() =>
                      setShowThought(showThought === msg.id ? null : msg.id)
                    }
                    className="flex items-center gap-2 text-xs text-[#7c828a] hover:text-[#0a0b0d] transition-colors"
                  >
                    <Clock size={12} />
                    <span className="font-mono bg-white px-2 py-1 rounded-md border border-[#eef0f3]">
                      {msg.tool}
                    </span>
                    {msg.thought && (
                      <span className="text-[#0052ff]">
                        {showThought === msg.id ? "Ẩn" : "Xem"} suy nghĩ
                      </span>
                    )}
                  </button>
                )}

                {/* Thought bubble */}
                {showThought === msg.id && msg.thought && (
                  <div className="rounded-lg bg-[#fef9e7] border border-[#f4b000]/20 p-3 text-xs text-[#5b616e] italic">
                    <span className="font-semibold text-[#f4b000] not-italic">
                      Thought:
                    </span>{" "}
                    {msg.thought}
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#0052ff] text-white rounded-br-md"
                      : "bg-white text-[#0a0b0d] rounded-bl-md border border-[#eef0f3]"
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
                  className="h-8 w-8 shrink-0 rounded-full bg-[#eef0f3]"
                />
              )}
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="px-6 py-3 bg-white border-t border-[#eef0f3]">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.prompt)}
                className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#f7f7f7] px-4 py-2 text-xs font-medium text-[#5b616e] hover:bg-[#eef0f3] transition-colors"
              >
                <action.icon size={14} />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-[#eef0f3]">
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
              disabled={!input.trim()}
              className="h-11 w-11 rounded-xl bg-[#0052ff] hover:bg-[#003ecc] p-0 disabled:opacity-50"
            >
              <PaperPlaneRight size={18} className="text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
