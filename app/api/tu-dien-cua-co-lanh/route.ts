import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/app/services/aiService";

export const dynamic = "force-dynamic";

const wordEntrySchema = z.object({
  isEnglish: z
    .boolean()
    .describe(
      "true if the input is a valid English word, false if it is not English (e.g. Vietnamese, random characters, gibberish)",
    ),
  word: z.string().describe("The English word (or the original input if not English)"),
  phonetic: z.string().describe("IPA phonetic transcription, e.g. /həˈloʊ/ (empty string if not English)"),
  meaning: z
    .string()
    .describe(
      "Nghĩa tiếng Việt — giải thích hài hước kiểu Cô Lành, dùng **bold** cho từ khóa quan trọng (empty string if not English)",
    ),
  example: z
    .string()
    .describe(
      "Câu ví dụ tiếng Anh bựa, nhây. Dùng markdown: **bold** cho từ chính trong câu (empty string if not English)",
    ),
  grammar_notes: z
    .string()
    .describe("Các lưu ý ngữ pháp, viết dạng markdown dùng bullet list (`- `) và **bold** cho thuật ngữ (empty string if not English)"),
  level: z
    .enum(["easy", "medium", "hard"])
    .describe("Difficulty level of this word (default 'easy' if not English)"),
});

const SYSTEM_PROMPT = `
You are "Cô Lành", a hilarious and slightly sarcastic Vietnamese English teacher.

First, determine if the input is a valid English word. Set isEnglish accordingly.
- If isEnglish is true, provide all fields with real data.
- If isEnglish is false, set phonetic/meaning/example to empty strings, grammar_notes to empty array, level to "easy".

When isEnglish is true, provide:
1. The IPA phonetic transcription
2. A Vietnamese meaning explained in your signature funny, witty style (accurate but entertaining)
3. A bựa/nhây example sentence in English that uses the word
4. Grammar notes related to the word (e.g. "Thường đi với giới từ 'on'", "Dạng quá khứ: went")
5. Difficulty level: "easy", "medium", or "hard"

Keep your personality: sharp, funny, memorable — but always educational.
`.trim();

export async function POST(req: Request) {
  try {
    const { word } = (await req.json()) as { word?: string };

    if (!word || typeof word !== "string" || word.trim().length === 0) {
      return Response.json({ error: "Vui lòng nhập một từ." }, { status: 400 });
    }

    const trimmed = word.trim().toLowerCase();

    if (/\s/.test(trimmed)) {
      return Response.json(
        { error: "Chỉ được nhập một từ duy nhất." },
        { status: 400 },
      );
    }



    const { object } = await generateObject({
      model,
      schema: wordEntrySchema,
      system: SYSTEM_PROMPT,
      prompt: `Look up the word: "${trimmed}"`,
    });

    return Response.json(object);
  } catch (err) {
    console.error("Dictionary API error:", err);
    return Response.json(
      { error: "Không thể tra từ. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
