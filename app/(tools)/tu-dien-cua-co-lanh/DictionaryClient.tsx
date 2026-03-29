"use client";

import { useState } from "react";
import { Button, Input, Tag, Skeleton, message, Divider } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";

type WordEntry = {
  isEnglish: boolean;
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  grammar_notes: string;
  level: "easy" | "medium" | "hard";
};

const LEVEL_MAP: Record<WordEntry["level"], { label: string; color: string }> =
  {
    easy: { label: "Dễ", color: "green" },
    medium: { label: "Trung bình", color: "orange" },
    hard: { label: "Khó", color: "red" },
  };

export default function DictionaryClient() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WordEntry | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const validate = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return "Vui lòng nhập một từ.";
    if (/\s/.test(trimmed)) return "Chỉ được nhập một từ duy nhất.";
    return null;
  };

  const handleSubmit = async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    const validationError = validate(input);
    if (validationError) {
      messageApi.warning(validationError);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/tu-dien-cua-co-lanh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: input.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Có lỗi xảy ra.");
      }

      const data: WordEntry = await res.json();
      setResult(data);
    } catch (err) {
      messageApi.error(
        err instanceof Error ? err.message : "Có lỗi xảy ra.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {contextHolder}

      {/* Search form */}
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 items-center">
          <Input
            size="large"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập một từ tiếng Anh…"
            prefix={<SearchOutlined className="text-zinc-400" />}
            disabled={loading}
            className="!rounded-xl !text-[15px]"
          />
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={loading}
            disabled={!input.trim() || loading}
            className="!rounded-xl !px-6"
          >
            Tra từ
          </Button>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="pt-2">
          <Skeleton.Input active className="!w-44 !mb-4" />
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && (
        <div className="text-center py-12 px-4 text-zinc-400">
          <SearchOutlined className="text-4xl mb-2" />
          <div className="text-sm">
            Nhập một từ tiếng Anh để Cô Lành tra cho
          </div>
        </div>
      )}

      {/* Not English */}
      {!loading && result && !result.isEnglish && (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">🤔</div>
          <div className="text-base font-semibold text-red-600 mb-1">
            &ldquo;{result.word}&rdquo; không phải từ tiếng Anh
          </div>
          <div className="text-sm text-zinc-500">
            Vui lòng nhập một từ tiếng Anh để Cô Lành tra cho nhé!
          </div>
        </div>
      )}

      {/* Result — unified flow, no extra borders */}
      {!loading && result && result.isEnglish && (
        <div className="animate-[fadeIn_0.35s_ease]">
          {/* Word header */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl font-bold text-zinc-900">
              {result.word}
            </span>
            <span className="text-base text-indigo-500 font-mono font-medium">
              {result.phonetic}
            </span>
            <Tag
              color={LEVEL_MAP[result.level].color}
              className="!rounded-lg !font-semibold !text-xs !px-2.5 !py-0.5"
            >
              {LEVEL_MAP[result.level].label}
            </Tag>
          </div>

          <Divider className="!my-4" />

          {/* Meaning */}
          {result.meaning && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                Nghĩa của từ
              </h3>
              <div className="markdown-body text-[15px] leading-relaxed text-zinc-800">
                <ReactMarkdown>{result.meaning}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Example */}
          {result.example && (
            <div className="mb-5 pl-4 border-l-3 border-amber-300">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                Ví dụ
              </h3>
              <div className="markdown-body text-[15px] leading-relaxed text-zinc-600 italic">
                <ReactMarkdown>{result.example}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Grammar notes */}
          {result.grammar_notes && (
            <div className="mt-5 pt-4 border-t border-dashed border-zinc-200">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                📝 Lưu ý ngữ pháp
              </h3>
              <div className="markdown-body text-sm leading-relaxed text-slate-700">
                <ReactMarkdown>{result.grammar_notes}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
