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

  // Memoize transport so useChat doesn't reinitialize on every render
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/co-minh-english/chat",
        // Send only the last 20 messages to the API
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

  // Load persisted history on mount (client-only — avoids SSR localStorage error)
  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) setMessages(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage whenever messages change
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

  // Auto-scroll to the latest message
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: 12,
      }}
    >
      {/* Sub-header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
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
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          background: "rgba(255, 255, 255, 0.7)",
          padding: 16,
        }}
      >
        {messages.length === 0 && !isBusy ? (
          <Text type="secondary" style={{ fontSize: 14 }}>
            Hãy nói với Cô Minh thử một câu tiếng Anh nhé, Hoàng.
          </Text>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m) => {
              const text = getMessageText(m);
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      m.role === "user" ? "flex-end" : "flex-start",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  {m.role === "assistant" && (
                    <Avatar
                      size={32}
                      style={{
                        background: "#1677ff",
                        flexShrink: 0,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      M
                    </Avatar>
                  )}

                  <div
                    style={{
                      maxWidth: "85%",
                      borderRadius: 16,
                      padding: "10px 14px",
                      background: m.role === "user" ? "#18181b" : "#ffffff",
                      border:
                        m.role === "assistant" ? "1px solid #e5e7eb" : "none",
                      color: m.role === "user" ? "#fff" : "#18181b",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.55,
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {m.role === "user" ? "Hoàng" : "Cô Minh"}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.65,
                        wordBreak: "break-word",
                      }}
                      className="markdown-body"
                    >
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
                      style={{
                        background: "#18181b",
                        flexShrink: 0,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      H
                    </Avatar>
                  )}
                </div>
              );
            })}

            {/* Spinner shown while waiting for the first streaming token */}
            {status === "submitted" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar
                  size={32}
                  style={{
                    background: "#1677ff",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
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
        <Text type="danger" style={{ fontSize: 12 }}>
          {error.message}
        </Text>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit}>
        <Space.Compact style={{ width: "100%", alignItems: "flex-end" }}>
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập tiếng Anh (hoặc pha tiếng Việt)…"
            disabled={isBusy}
            autoSize={{ minRows: 2, maxRows: 5 }}
            style={{
              borderRadius: "16px 0 0 16px",
              fontSize: 14,
              resize: "none",
            }}
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
            style={{
              borderRadius: "0 16px 16px 0",
              height: "auto",
              alignSelf: "stretch",
              padding: "0 20px",
              fontSize: 14,
            }}
          >
            {isBusy ? "Đang…" : "Gửi"}
          </Button>
        </Space.Compact>
      </form>
    </div>
  );
}
