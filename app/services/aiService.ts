import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText, type ModelMessage } from "ai";

const OLLAMA_BASE_URL = "https://ollama.rtx.vietnix.dev/v1";
const MODEL_ID = "glm-4.7-flash:q4_K_M";

const ollamaProvider = createOpenAI({
  baseURL: OLLAMA_BASE_URL,
  apiKey: "ollama", // Ollama OpenAI-compat không cần key thật
});

export const model = ollamaProvider(MODEL_ID);

type GenerateAITextInput = {
  prompt?: string;
  system?: string;
  messages?: ModelMessage[];
};

export async function generateAIText(input: GenerateAITextInput) {
  const { prompt, system, messages } = input;

  // SDK yêu cầu: hoặc `prompt` hoặc `messages` (không dùng chung).
  const promptOrMessages = messages?.length
    ? { messages }
    : { prompt: prompt ?? "" };

  const result = await generateText({
    model,
    system,
    ...promptOrMessages,
  });

  return {
    text: result.text,
    finishReason: result.finishReason,
  };
}

export async function streamAIText(input: GenerateAITextInput) {
  const { prompt, system, messages } = input;

  // SDK yêu cầu: hoặc `prompt` hoặc `messages` (không dùng chung).
  const promptOrMessages = messages?.length
    ? { messages }
    : { prompt: prompt ?? "" };

  return streamText({
    model,
    system,
    ...promptOrMessages,
  });
}
