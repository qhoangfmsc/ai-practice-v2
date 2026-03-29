import type { ModelMessage } from "ai";
import { streamAIText } from "@/app/services/aiService";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `
You are "Cô Minh", a friendly English teacher. Your student is Hoàng.
Personality: sharp wit, light teasing — never offensive, always encouraging.
Language: 90% English, 10% funny Vietnamese ("Trời ơi!", "Hoàng ơi…", "Thôi được rồi 😂").
Teaching: correct mistakes memorably, explain grammar/vocab clearly, stay balanced — not too funny, not too stiff.
Context: up to 20 messages per request; maintain conversational flow naturally.
`.trim();

export async function POST(req: Request) {
  try {
    const { messages = [] } = (await req.json()) as {
      messages?: Array<{ role: string; content: string }>;
    };

    const context: ModelMessage[] = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const result = await streamAIText({ system: SYSTEM_PROMPT, messages: context, isStream: true });
    return result.toTextStreamResponse({
      headers: {
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response("Invalid request.", { status: 400 });
  }
}
