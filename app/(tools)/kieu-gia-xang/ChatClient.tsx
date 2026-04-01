"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Button, Input, Space, Spin, Typography, Popover } from "antd";
import ReactMarkdown from "react-markdown";
import { SettingOutlined } from "@ant-design/icons";

const { Text } = Typography;

const STORAGE_KEY = "kieu-gia-xang:messages:v1";
const WEBHOOK_KEY = "kieu-gia-xang:webhook:v1";
const MAX_STORED = 200;

function getMessageText(msg: UIMessage): string {
  if (!msg.parts || msg.parts.length === 0) return "";
  return msg.parts
    .filter((p): p is { type: "text"; text: string } & typeof p => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

export default function ChatClient() {
  const endRef = useRef<HTMLDivElement>(null);

  const [discordWebhook, setDiscordWebhook] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [input, setInput] = useState("Giá xăng hôm nay bao nhiêu?");

  useEffect(() => {
    const savedWebhook = localStorage.getItem(WEBHOOK_KEY);
    if (savedWebhook) setDiscordWebhook(savedWebhook);
  }, []);

  const discordWebhookRef = useRef(discordWebhook);
  useEffect(() => {
    discordWebhookRef.current = discordWebhook;
  }, [discordWebhook]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/kieu-gia-xang/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            discordWebhook: discordWebhookRef.current,
          },
        }),
      }),
    []
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: UIMessage[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  const handleManualSubmit = (e?: React.FormEvent) => {
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

  const handleSaveWebhook = (val: string) => {
    setDiscordWebhook(val);
    localStorage.setItem(WEBHOOK_KEY, val);
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Cấu hình Webhook */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <Text type="secondary" className="text-[13px]">
            Hỏi Cô Kiều Giá Xăng để tra cứu và report lên Discord
          </Text>
          <Space>
            <Popover
              content={
                <div className="flex flex-col gap-2 w-72">
                  <Text strong className="text-sm">Discord Webhook URL</Text>
                  <Input
                    value={discordWebhook}
                    onChange={(e) => handleSaveWebhook(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="text-sm"
                  />
                  <Text type="secondary" className="text-xs">
                    Cần điền Webhook để Kiều gửi report. Bạn có thể hỏi giá trước mà không cần Webhook.
                  </Text>
                </div>
              }
              title="Cấu hình Discord"
              trigger="click"
              open={showConfig}
              onOpenChange={setShowConfig}
              placement="bottomRight"
            >
              <Button
                size="small"
                icon={<SettingOutlined />}
                type={showConfig ? "primary" : "default"}
              >
                Cấu hình Discord
              </Button>
            </Popover>
            <Button size="small" onClick={handleReset} disabled={isBusy || messages.length === 0}>
              Reset
            </Button>
          </Space>
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-zinc-200 bg-white/70 p-4">
        {messages.length === 0 && !isBusy ? (
            <Text type="secondary" className="text-sm">
              Thử hỏi: &quot;Giá xăng anh em ơi&quot; hoặc &quot;Tra giá xăng xong gửi lên Discord giùm cô&quot;
            </Text>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <Avatar size={32} className="shrink-0 bg-rose-500 text-[13px] font-semibold">
                      Kiều
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 flex flex-col gap-2 ${
                      m.role === "user"
                        ? "bg-zinc-900 text-white"
                        : "bg-white border border-zinc-200 text-zinc-900"
                    }`}
                  >
                    <div className="text-[11px] opacity-55 font-medium">
                      {m.role === "user" ? "User" : "Cô Kiều Giá Xăng"}
                    </div>

                    {/* Tool Invocations */}
                    {m.parts
                      ?.filter((p) => p.type === "dynamic-tool" || p.type.startsWith("tool-"))
                      .map((p) => {
                      const toolPart = p as Record<string, unknown>;
                      const toolCallId = toolPart.toolCallId as string;
                      const toolName = p.type === 'dynamic-tool' ? toolPart.toolName as string : p.type.replace('tool-', '');
                      
                      return (
                        <Fragment key={toolCallId}>
                          <div className="font-bold text-[13px] text-blue-600 mb-1 mt-2">
                            Gọi tool {toolName}....
                          </div>

                          {Boolean(toolPart.args || toolPart.input) && (
                            <div className="flex flex-col mb-2">
                              <div className="bg-slate-200 border border-slate-200 rounded-t-lg p-2 px-3 text-[12px] font-bold text-slate-700 flex flex-col gap-2 uppercase tracking-wide">
                                Input
                              </div>
                              <div className="bg-slate-50 border border-t-0 border-slate-200 rounded-b-lg p-3 text-[13px] text-slate-800 flex flex-col gap-2 font-mono">
                                <div className="flex flex-col gap-1">
                                  <pre className="m-0! bg-transparent text-[13px] whitespace-pre-wrap">
                                    {JSON.stringify(toolPart.args || toolPart.input, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          )}

                          {('result' in toolPart || 'output' in toolPart) && (toolPart.result !== undefined || toolPart.output !== undefined) ? (
                            <div className="flex flex-col mb-2">
                              <div className="bg-emerald-200 border border-emerald-200 rounded-t-lg p-2 px-3 text-[12px] font-bold text-emerald-800 flex flex-col gap-2 uppercase tracking-wide">
                                Output
                              </div>
                              <div className="bg-emerald-50 border border-t-0 border-emerald-200 rounded-b-lg p-3 text-[13px] text-emerald-900 flex flex-col gap-2 font-mono">
                                <div className="flex flex-col gap-1">
                                  <pre className="m-0! bg-transparent text-[13px] whitespace-pre-wrap text-emerald-700">
                                    {JSON.stringify(toolPart.result ?? toolPart.output, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col mb-2">
                              <div className="bg-slate-200 border border-slate-200 rounded-t-lg p-2 px-3 text-[12px] font-bold text-slate-700 flex flex-col gap-2 uppercase tracking-wide">
                                Output
                              </div>
                              <div className="bg-slate-50 border border-t-0 border-slate-200 rounded-b-lg p-3 text-[13px] text-slate-800 flex flex-col gap-2 font-mono">
                                <div className="italic text-slate-500">
                                  Đang xử lý...
                                </div>
                              </div>
                            </div>
                          )}
                        </Fragment>
                      );
                    })}


                    {/* Text content */}
                    {getMessageText(m) && (
                      <div className="text-sm leading-relaxed wrap-break-word markdown-body">
                        <ReactMarkdown>{getMessageText(m)}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {m.role === "user" && (
                    <Avatar size={32} className="shrink-0 bg-zinc-900 text-[13px] font-semibold">
                      U
                    </Avatar>
                  )}
                </div>
              );
            })}

            {(status === "submitted" || status === "streaming") && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-center gap-2">
                <Avatar size={32} className="bg-rose-500 text-[13px] font-semibold">
                  Kiều
                </Avatar>
                <Spin size="small" />
              </div>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <Text type="danger" className="text-xs">
          {error.message}
        </Text>
      )}

      {/* Input */}
      <form onSubmit={handleManualSubmit}>
        <Space.Compact className="w-full items-end">
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi giá xăng hoặc rủ Kiều gửi thông báo..."
            disabled={isBusy}
            autoSize={{ minRows: 2, maxRows: 5 }}
            className="rounded-l-2xl! rounded-r-none! text-sm resize-none!"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleManualSubmit();
              }
            }}
          />
          <Button
            type="primary"
            htmlType="submit"
            disabled={isBusy || !input.trim()}
            className="rounded-r-2xl! rounded-l-none! h-auto! self-stretch px-5! text-sm"
          >
            {isBusy ? "Đang..." : "Gửi"}
          </Button>
        </Space.Compact>
      </form>
    </div>
  );
}
