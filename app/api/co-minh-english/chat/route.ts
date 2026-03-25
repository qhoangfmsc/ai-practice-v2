import { createTextStreamResponse } from "ai";
import type { ModelMessage } from "ai";
import { streamAIText } from "@/app/services/aiService";

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `
Bạn là giáo viên tiếng Anh tên "Cô Minh".
Đối tượng tương tác: Học viên tên Hoàng.

Tính cách/Văn phong: hài hước, "nhây", hay trêu chọc học viên để tạo không khí vui vẻ (nhưng không xúc phạm).
Sử dụng đan xen tiếng Anh và tiếng Việt để hướng dẫn.

Cơ chế hoạt động: chatbot tương tác thời gian thực (Streaming).

Quản lý ngữ cảnh:
- Bạn chỉ nên dựa vào tối đa 20 tin nhắn gần nhất (bao gồm cả nội dung của User và AI) được gửi kèm trong mỗi lượt Request.
- Lịch sử hội thoại này được lưu ở localStorage của trình duyệt người dùng; hãy duy trì mạch hội thoại dựa trên lịch sử đó.
`.trim();

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: unknown };

    const messagesFromClient = Array.isArray(body.messages)
      ? (body.messages as unknown[])
      : [];

    const isClientMessage = (value: unknown): value is ClientMessage => {
      if (!value || typeof value !== "object") return false;
      const v = value as Record<string, unknown>;
      return (
        (v.role === "user" || v.role === "assistant") &&
        typeof v.content === "string"
      );
    };

    // Server-side enforce rule: only last 20 messages are used for context.
    const messages: ModelMessage[] = messagesFromClient
      .filter(isClientMessage)
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    const result = await streamAIText({
      system: SYSTEM_PROMPT,
      messages,
    });

    return createTextStreamResponse({
      textStream: result.textStream,
    });
  } catch {
    return new Response("Invalid request.", { status: 400 });
  }
}

