import { one } from "./db";
import type { AiConfig } from "./ai";

export function getAiConfig(): AiConfig {
  const get = (key: string) => one<{ value: string }>("SELECT value FROM settings WHERE key = ?", key)?.value ?? "";
  return {
    provider: get("ai_provider") || "demo",
    model: get("ai_model"),
    apiKey: get("ai_key"),
    baseUrl: get("ai_base_url"),
  };
}

export function aiConfigured(): boolean {
  return !!one("SELECT value FROM settings WHERE key = 'ai_key'");
}
