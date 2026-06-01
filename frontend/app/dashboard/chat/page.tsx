"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  Copy,
  Check,
} from "phosphor-react";
import { getDicebearAvatar } from "@/lib/avatar";
import { sendChatMessageStream, StreamEvent } from "@/lib/api";

const STORAGE_KEY = "crewwise_conversations";

interface ToolCall {
  tool: string;
  args?: unknown;
  observation?: unknown;
  blocked?: string;
  pendingConfirmation?: boolean;
  confirmed?: boolean;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  time: string;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  sessionId?: string;
  lastMessage: string;
  time: string;
}

const quickActions = [
  { icon: CalendarBlank, label: "Xin nghỉ phép", prompt: "Tôi muốn tạo đơn xin nghỉ phép" },
  { icon: BookOpen, label: "Chính sách", prompt: "Cho tôi hỏi về chính sách công ty" },
  { icon: Users, label: "Thông tin nhân viên", prompt: "Tìm thông tin nhân viên" },
  { icon: Lightning, label: "Kiểm tra phép", prompt: "Kiểm tra số ngày phép còn lại" },
];

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(convos: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));
}

function newConversation(): Conversation {
  return {
    id: Date.now().toString(),
    title: "Cuộc trò chuyện mới",
    messages: [],
    lastMessage: "Bắt đầu trò chuyện với AI...",
    time: "Vừa xong",
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#f7f7f7] text-[#7c828a] hover:text-[#0a0b0d] opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function formatToolValue(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const convos = loadConversations();
    if (convos.length === 0) {
      const fresh = newConversation();
      setConversations([fresh]);
      setActiveConvoId(fresh.id);
    } else {
      setConversations(convos);
      setActiveConvoId(convos[0].id);
    }
  }, []);

  const activeConvo = conversations.find((c) => c.id === activeConvoId) || conversations[0];
  const messages = activeConvo?.messages ?? [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const updateConversation = useCallback(
    (convoId: string, updater: (c: Conversation) => Conversation) => {
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === convoId ? updater(c) : c));
        saveConversations(next);
        return next;
      });
    },
    []
  );

  const updateMessage = useCallback(
    (convoId: string, messageId: number, updater: (m: Message) => Message) => {
      updateConversation(convoId, (convo) => ({
        ...convo,
        messages: convo.messages.map((m) => (m.id === messageId ? updater(m) : m)),
      }));
    },
    [updateConversation]
  );

  const handleNewConversation = () => {
    const fresh = newConversation();
    const next = [fresh, ...conversations];
    setConversations(next);
    setActiveConvoId(fresh.id);
    saveConversations(next);
  };

  const handleDeleteConversation = (convoId: string) => {
    const next = conversations.filter((c) => c.id !== convoId);
    if (next.length === 0) {
      const fresh = newConversation();
      setConversations([fresh]);
      setActiveConvoId(fresh.id);
      saveConversations([fresh]);
    } else {
      setConversations(next);
      if (activeConvoId === convoId) setActiveConvoId(next[0].id);
      saveConversations(next);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeConvo) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    const assistantMessage: Message = {
      id: Date.now() + 1,
      role: "assistant",
      content: "",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      isStreaming: true,
    };

    const convoId = activeConvo.id;
    const currentInput = input;

    updateConversation(convoId, (c) => ({
      ...c,
      messages: [...c.messages, userMessage, assistantMessage],
      title: c.messages.length === 0 ? currentInput.slice(0, 40) : c.title,
      lastMessage: currentInput.slice(0, 50),
      time: "Vừa xong",
    }));

    setInput("");
    setIsLoading(true);
    setTimeout(scrollToBottom, 100);

    try {
      const user = JSON.parse(localStorage.getItem("crewwise_user") || "{}");

      await sendChatMessageStream(
        currentInput,
        (event: StreamEvent) => {
          if (event.type === "trace" && event.tool) {
            updateMessage(convoId, assistantMessage.id, (m) => ({
              ...m,
              toolCalls: [
                ...(m.toolCalls ?? []),
                {
                  tool: event.tool!,
                  args: event.args,
                  observation: event.observation,
                  blocked: event.blocked,
                  pendingConfirmation: event.pending_confirmation,
                  confirmed: event.confirmed,
                },
              ],
            }));
          }

          if (event.type === "chunk" && event.content) {
            updateMessage(convoId, assistantMessage.id, (m) => ({
              ...m,
              content: m.content + event.content,
            }));
            setTimeout(scrollToBottom, 50);
          }

          if (event.type === "done") {
            updateConversation(convoId, (c) => ({
              ...c,
              sessionId: event.session_id,
            }));
            updateMessage(convoId, assistantMessage.id, (m) => ({
              ...m,
              isStreaming: false,
            }));
          }
        },
        activeConvo.sessionId,
        user.employee_id || "current_user",
        user.role || "employee"
      );
    } catch {
      updateMessage(convoId, assistantMessage.id, (m) => ({
        ...m,
        content: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.",
        isStreaming: false,
      }));
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
            onClick={handleNewConversation}
          >
            <Plus size={16} className="mr-2" />
            Cuộc trò chuyện mới
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {conversations.map((convo) => (
            <div
              key={convo.id}
              onClick={() => setActiveConvoId(convo.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") setActiveConvoId(convo.id); }}
              className={`w-full text-left p-4 border-b border-[#eef0f3] transition-colors group cursor-pointer ${
                activeConvoId === convo.id ? "bg-[#eef4ff]" : "hover:bg-[#f7f7f7]"
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
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-[#7c828a]">{convo.time}</span>
                   <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(convo.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#fee2e2] text-[#7c828a] hover:text-[#cf202f] transition-opacity"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>
            </div>
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
              <p className="text-sm font-semibold text-[#0a0b0d]">Crewwise AI</p>
              <p className="text-xs text-[#05b169]">Đang hoạt động</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7c828a] hover:bg-[#f7f7f7]">
              <Archive size={16} />
            </button>
            <button
              onClick={() => activeConvo && handleDeleteConversation(activeConvo.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7c828a] hover:bg-[#f7f7f7]"
            >
              <Trash size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
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
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <img
                  src={getDicebearAvatar("crewwise-ai@crewwise.com")}
                  alt="Crewwise AI"
                  className="h-8 w-8 shrink-0 rounded-full bg-[#eef0f3]"
                />
              )}

              <div
                className={`max-w-[70%] space-y-2 ${msg.role === "user" ? "order-first" : ""}`}
              >
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="space-y-2">
                    {msg.toolCalls.map((toolCall, index) => (
                      <div
                        key={`${msg.id}-tool-${index}`}
                        className="rounded-xl border border-[#d9e6ff] bg-[#eef4ff] px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-xs text-[#4a5a75]">
                          <span className="font-mono rounded-md bg-white px-2 py-1 border border-[#d9e6ff]">
                            {toolCall.tool}
                          </span>
                          {toolCall.pendingConfirmation && (
                            <span className="rounded-md bg-[#fff7e6] px-2 py-1 text-[#9a6700]">
                              Chờ xác nhận
                            </span>
                          )}
                          {toolCall.blocked && (
                            <span className="rounded-md bg-[#ffe9e9] px-2 py-1 text-[#b42318]">
                              {toolCall.blocked}
                            </span>
                          )}
                          {toolCall.confirmed && (
                            <span className="rounded-md bg-[#e8fff3] px-2 py-1 text-[#027a48]">
                              Đã xác nhận
                            </span>
                          )}
                        </div>
                        {toolCall.args !== undefined && (
                          <div className="mt-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-[#667085]">
                              Args
                            </p>
                            <pre className="mt-1 overflow-x-auto rounded-lg bg-white p-2 text-xs text-[#0a0b0d] border border-[#d9e6ff]">
                              {formatToolValue(toolCall.args)}
                            </pre>
                          </div>
                        )}
                        {toolCall.observation !== undefined && toolCall.observation !== null && (
                          <div className="mt-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-[#667085]">
                              Observation
                            </p>
                            <pre className="mt-1 overflow-x-auto rounded-lg bg-white p-2 text-xs text-[#0a0b0d] border border-[#d9e6ff]">
                              {formatToolValue(toolCall.observation)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === "user" ? (
                  <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-[#0052ff] text-white rounded-br-md">
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ) : (
                  <div className="group relative rounded-2xl px-4 py-3 text-sm leading-relaxed bg-white text-[#0a0b0d] rounded-bl-md border border-[#eef0f3]">
                    <CopyButton text={msg.content} />
                    <div className="markdown-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-xl font-bold mb-2 text-[#0a0b0d]">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-lg font-semibold mb-2 text-[#0a0b0d]">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-base font-semibold mb-1 text-[#0a0b0d]">{children}</h3>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-[#0a0b0d]">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-[#0a0b0d]">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic">{children}</em>
                          ),
                          code: ({ children, className }) => {
                            const isInline = !className;
                            if (isInline) {
                              return (
                                <code className="bg-[#f7f7f7] px-1.5 py-0.5 rounded text-xs font-mono text-[#0052ff]">
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <code className="block bg-[#0a0b0d] text-[#eef0f3] p-3 rounded-lg text-xs font-mono overflow-x-auto">
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => (
                            <pre className="mb-2 rounded-lg overflow-hidden">{children}</pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-[#0052ff] pl-4 py-1 mb-2 bg-[#eef4ff] rounded-r-lg">
                              {children}
                            </blockquote>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto mb-2">
                              <table className="min-w-full border-collapse border border-[#eef0f3]">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border border-[#eef0f3] px-3 py-2 bg-[#f7f7f7] text-left font-semibold text-sm">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-[#eef0f3] px-3 py-2 text-sm">
                              {children}
                            </td>
                          ),
                          hr: () => <hr className="border-[#eef0f3] my-4" />,
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0052ff] hover:underline"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-[#7c828a] ml-1 animate-pulse" />
                    )}
                  </div>
                )}

                <p
                  className={`text-xs text-[#7c828a] ${msg.role === "user" ? "text-right" : ""}`}
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
          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions */}
        <div className="px-6 py-3 bg-white border-t border-[#eef0f3]">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
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
