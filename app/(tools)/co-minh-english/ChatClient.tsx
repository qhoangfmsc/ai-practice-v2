"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Button, Input, Space, Spin, Typography } from "antd";
import ReactMarkdown from "react-markdown";

const { Text } = Typography;

const STORAGE_KEY = "co-minh-english:messages:v2";
const MAX_STORED = 200;

/** Extract all text from a UIMessage's parts array. */
function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } & typeof p =>
      p.type === "text",
    )
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

function loadMessages(): UIMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is UIMessage =>
        m != null &&
        typeof m === "object" &&
        typeof (m as Record<string, unknown>).id === "string" &&
        ((m as Record<string, unknown>).role === "user" ||
          (m as Record<string, unknown>).role === "assistant") &&
        Array.isArray((m as Record<string, unknown>).parts),
    );
  } catch {
    return [];
  }
}

export default function ChatClient() {
  const endRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/co-minh-english/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages: messages.slice(-20).map((m) => ({
              role: m.role,
              content: getMessageText(m),
            })),
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
  });

  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) setMessages(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_STORED)),
      );
    } catch {
      // ignore write failures
    }
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = (e?: { preventDefault?: () => void }) => {
    if (e?.preventDefault) e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    void sendMessage({ text });
  };

  const handleReset = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <Text type="secondary" className="text-[13px]">
          Hoàng gửi câu · Cô Minh trả lời · tối đa 20 tin gần nhất
        </Text>
        <Button
          size="small"
          onClick={handleReset}
          disabled={isBusy || messages.length === 0}
        >
          Reset
        </Button>
      </div>

      {/* Message area */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-zinc-200 bg-white/70 p-4">
        {messages.length === 0 && !isBusy ? (
          <Text type="secondary" className="text-sm">
            Hãy nói với Cô Minh thử một câu tiếng Anh nhé, Hoàng.
          </Text>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const text = getMessageText(m);
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <Avatar
                      size={32}
                      className="shrink-0 bg-blue-500 text-[13px] font-semibold"
                    >
                      M
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                      m.role === "user"
                        ? "bg-zinc-900 text-white"
                        : "bg-white border border-zinc-200 text-zinc-900"
                    }`}
                  >
                    <div className="text-[11px] opacity-55 mb-1 font-medium">
                      {m.role === "user" ? "Hoàng" : "Cô Minh"}
                    </div>
                    <div className="text-sm leading-relaxed break-words markdown-body">
                      {text ? (
                        <ReactMarkdown>{text}</ReactMarkdown>
                      ) : m.role === "assistant" ? (
                        <Spin size="small" />
                      ) : null}
                    </div>
                  </div>

                  {m.role === "user" && (
                    <Avatar
                      size={32}
                      className="shrink-0 bg-zinc-900 text-[13px] font-semibold"
                    >
                      H
                    </Avatar>
                  )}
                </div>
              );
            })}

            {status === "submitted" && (
              <div className="flex items-center gap-2">
                <Avatar
                  size={32}
                  className="bg-blue-500 text-[13px] font-semibold"
                >
                  M
                </Avatar>
                <Spin size="small" />
              </div>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Error */}
      {error && (
        <Text type="danger" className="text-xs">
          {error.message}
        </Text>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit}>
        <Space.Compact className="w-full items-end">
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập tiếng Anh (hoặc pha tiếng Việt)…"
            disabled={isBusy}
            autoSize={{ minRows: 2, maxRows: 5 }}
            className="!rounded-l-2xl !rounded-r-none text-sm !resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            type="primary"
            htmlType="submit"
            disabled={isBusy || !input.trim()}
            className="!rounded-r-2xl !rounded-l-none !h-auto self-stretch !px-5 text-sm"
          >
            {isBusy ? "Đang…" : "Gửi"}
          </Button>
        </Space.Compact>
      </form>
    </div>
  );
}
