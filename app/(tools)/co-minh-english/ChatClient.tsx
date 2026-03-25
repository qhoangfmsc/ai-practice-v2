"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type Role = "user" | "assistant";
type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

const STORAGE_KEY = "co-minh-english:messages:v1";
const MAX_CONTEXT_MESSAGES = 20;
const MAX_STORED_MESSAGES = 200;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.role === "user" || v.role === "assistant") &&
    typeof v.content === "string" &&
    typeof v.id === "string"
  );
}

function trimMessages(messages: ChatMessage[]) {
  return messages.slice(-MAX_STORED_MESSAGES);
}

export default function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const loaded = parsed.filter(isChatMessage);
      setMessages(trimMessages(loaded));
    } catch {
      // If localStorage is blocked/corrupt, just start fresh.
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const persist = (next: ChatMessage[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimMessages(next)));
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setError(null);
    setIsStreaming(false);
    setMessages([]);
    persist([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    const userMsg: ChatMessage = {
      id: createId(),
      role: "user",
      content: text,
    };

    const assistantId = createId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    const nextBeforeStream = [...messages, userMsg, assistantMsg];
    setMessages(nextBeforeStream);
    persist(nextBeforeStream);

    const contextMessages = [...messages, userMsg]
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/co-minh-english/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: contextMessages }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Request failed: ${res.status}`);
      }

      if (!res.body) throw new Error("No response body.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let full = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        full += decoder.decode(value, { stream: true });

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m)),
        );
      }

      const nextAfterStream: ChatMessage[] = [
        ...messages,
        userMsg,
        { ...assistantMsg, content: full },
      ];
      persist(nextAfterStream);
      setMessages(trimMessages(nextAfterStream));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Có lỗi xảy ra khi gọi AI.";

      setError(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `(${msg})` } : m
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-zinc-600">
          Hoàng gửi câu, Cô Minh trả lời (streaming + nhớ tối đa 20 tin gần nhất).
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={isStreaming || messages.length === 0}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 disabled:opacity-50"
        >
          Reset
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-zinc-200 bg-white/70 p-4">
        {messages.length === 0 ? (
          <div className="text-sm text-zinc-500">
            Hãy nói với Cô Minh thử một câu tiếng Anh nhé, Hoàng.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl bg-zinc-900 px-4 py-3 text-white"
                    : "mr-auto max-w-[85%] rounded-2xl bg-white px-4 py-3 text-zinc-900 border border-zinc-200"
                }
              >
                <div className="text-[11px] opacity-70 mb-1">
                  {m.role === "user" ? "Hoàng" : "Cô Minh"}
                </div>
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {m.content || (m.role === "assistant" ? "..." : null)}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(ev) => setInput(ev.target.value)}
          placeholder="Nhập tiếng Anh (hoặc pha tiếng Việt)..."
          disabled={isStreaming}
          rows={2}
          className="flex-1 resize-none rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 text-sm outline-none disabled:opacity-60"
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && !ev.shiftKey) {
              ev.preventDefault();
              // Submit via form.
              (ev.currentTarget.form as HTMLFormElement | null)?.requestSubmit?.();
            }
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white disabled:opacity-50"
        >
          {isStreaming ? "Đang..." : "Gửi"}
        </button>
      </form>

      {error ? (
        <div className="mt-2 text-xs text-red-600">
          {error}
        </div>
      ) : null}
    </div>
  );
}

