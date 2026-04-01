import { openai } from "@ai-sdk/openai";
import { generateText, streamText, type ModelMessage } from "ai";

const MODEL_ID = "gpt-4o-mini";

export const model = openai(MODEL_ID);

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

export async function streamAIText(
  input: GenerateAITextInput,
) {
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
