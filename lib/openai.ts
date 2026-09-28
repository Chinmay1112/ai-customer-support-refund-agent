import OpenAI from "openai";

export const getOpenAIClient = (): OpenAI | null => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-openai-api-key-here") {
    return null;
  }

  const isGemini = apiKey.startsWith("AQ.") || Boolean(process.env.GEMINI_API_KEY);
  const baseURL =
    process.env.OPENAI_BASE_URL ||
    (isGemini ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined);

  return new OpenAI({
    apiKey,
    baseURL,
  });
};

export const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  ((process.env.OPENAI_API_KEY?.startsWith("AQ.") || process.env.GEMINI_API_KEY)
    ? "gemini-flash-latest"
    : "gpt-4o-mini");

export const isOpenAIAvailable = (): boolean => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey.trim() !== "" && apiKey !== "your-openai-api-key-here");
};

