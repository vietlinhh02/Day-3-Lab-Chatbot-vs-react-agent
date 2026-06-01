"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PaperPlaneRight,
  Plus,
  MagnifyingGlass,
  Trash,
  Archive,
  Lightning,
  BookOpen,
  CalendarBlank,
  Users,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";
import { sendChatMessage, ChatMessage } from "@/lib/api";

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
}

const conversations: Conversation[] = [
  {
    id: "1",
    title: "Cuộc trò chuyện mới",
    lastMessage: "Bắt đầu trò chuyện với AI...",
    time: "Vừa xong",
  },
];

const quickActions = [
  { icon: CalendarBlank, label: "Xin nghỉ phép", prompt: "Tôi muốn tạo đơn xin nghỉ phép" },
  { icon: BookOpen, label: "Chính sách", prompt: "Cho tôi hỏi về chính sách công ty" },
  { icon: Users, label: "Thông tin nhân viên", prompt: "Tìm thông tin nhân viên" },
  { icon: Lightning, label: "Kiểm tra phép", prompt: "Kiểm tra số ngày phép còn lại" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [activeConvo, setActiveConvo] = useState("1");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem("crewwise_user") || "{}");
      const response = await sendChatMessage(
        input,
        sessionId,
        user.employee_id || "current_user",
        user.role || "employee"
      );

      setSessionId(response.session_id);

      const assistantMessage: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: response.response,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        thought: response.trace?.[0]?.thought,
        tool: response.trace?.[0]?.tool,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: "Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại.",
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-128px)] gap-0 rounded-2xl overflow-hidden border border-[#eef0f3]">
      {/* Conversation list */}
      <div className="w-72 shrink-0 bg-white border-r border-[#eef0f3] flex flex-col">
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

        <div className="p-3">
          <Button
            variant="outline"
            className="w-full rounded-lg h-10 border-[#dee1e6] text-[#0a0b0d] font-medium text-sm"
            onClick={() => {
              setMessages([]);
              setSessionId(undefined);
            }}
          >
            <Plus size={16} className="mr-2" />
            Cuộc trò chuyện mới
          </Button>
        </div>

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
            <img
              src={getDicebearAvatar("crewwise-ai@crewwise.com")}
              alt="Crewwise AI"
              className="h-8 w-8 rounded-full bg-[#eef0f3]"
            />
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
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <img
                src={getDicebearAvatar("crewwise-ai@crewwise.com")}
                alt="Crewwise AI"
                className="h-16 w-16 rounded-full bg-[#eef0f3] mb-4"
              />
              <h3 className="text-lg font-semibold text-[#0a0b0d] mb-2">
                Xin chào! Mình là Crewwise AI
              </h3>
              <p className="text-sm text-[#5b616e] max-w-md">
                Mình có thể giúp bạn kiểm tra ngày phép, tạo đơn xin nghỉ,
                tìm kiếm chính sách và quản lý công việc. Hãy hỏi mình nhé!
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <img
                  src={getDicebearAvatar("crewwise-ai@crewwise.com")}
                  alt="Crewwise AI"
                  className="h-8 w-8 shrink-0 rounded-full bg-[#eef0f3]"
                />
              )}

              <div
                className={`max-w-[70%] space-y-2 ${
                  msg.role === "user" ? "order-first" : ""
                }`}
              >
                {msg.tool && (
                  <div className="flex items-center gap-2 text-xs text-[#7c828a]">
                    <span className="font-mono bg-white px-2 py-1 rounded-md border border-[#eef0f3]">
                      {msg.tool}
                    </span>
                  </div>
                )}

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
                  src={getDicebearAvatar(
                    JSON.parse(
                      localStorage.getItem("crewwise_user") || '{"email":"user@example.com"}'
                    ).email
                  )}
                  alt="User"
                  className="h-8 w-8 shrink-0 rounded-full bg-[#eef0f3]"
                />
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <img
                src={getDicebearAvatar("crewwise-ai@crewwise.com")}
                alt="Crewwise AI"
                className="h-8 w-8 shrink-0 rounded-full bg-[#eef0f3]"
              />
              <div className="bg-white rounded-2xl rounded-bl-md border border-[#eef0f3] px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 bg-[#7c828a] rounded-full animate-bounce" />
                  <div className="h-2 w-2 bg-[#7c828a] rounded-full animate-bounce delay-100" />
                  <div className="h-2 w-2 bg-[#7c828a] rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
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
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
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
