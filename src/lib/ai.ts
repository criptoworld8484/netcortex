/**
 * AI provider clients. The API key is stored locally in the settings table and
 * only used server-side. Only anonymized text (placeholders) is ever sent.
 */

export interface AiConfig {
  provider: string; // "anthropic" | "openai" | "openai-compatible" | "demo"
  model: string;
  apiKey: string;
  baseUrl: string;
}

export class AiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const SYSTEM_PROMPT = `You are a senior multi-vendor network troubleshooting assistant for an engineer
who operates Cisco IOS/NX-OS, Juniper Junos, FortiGate FortiOS, Palo Alto PAN-OS and Check Point.

Rules:
- The user's text contains placeholders like <IP_1>, <HOST_2>, <USER_1> for anonymized values. Treat them as real values; keep using the same placeholders in your answer.
- Structure the answer as: 1) Most likely root causes (ranked, with reasoning tied to the evidence), 2) Exact verification commands for the platforms involved, 3) Recommended fix, 4) What to check if that fails.
- Be concise and technical. No filler. If the evidence is insufficient, say exactly what output you need next.`;

async function fetchJson(url: string, init: RequestInit, timeoutMs = 90000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok) {
      let detail = text.slice(0, 300);
      try {
        const j = JSON.parse(text) as { error?: { message?: string } };
        if (j.error?.message) detail = j.error.message;
      } catch { /* keep raw */ }
      throw new AiError(`${res.status} ${res.statusText}: ${detail}`, res.status);
    }
    return JSON.parse(text) as unknown;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Error && e.name === "AbortError") throw new AiError("Request timed out.");
    throw new AiError(e instanceof Error ? e.message : "Network error");
  } finally {
    clearTimeout(t);
  }
}

export async function callAssistant(cfg: AiConfig, prompt: string): Promise<string> {
  if (cfg.provider === "demo") {
    return demoAnswer(prompt);
  }
  if (!cfg.apiKey) {
    throw new AiError("No API key configured (Settings → AI Assistant).");
  }

  if (cfg.provider === "anthropic") {
    const base = (cfg.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");
    const j = (await fetchJson(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model || "claude-sonnet-4-5",
        max_tokens: 1500,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    })) as { content?: { type: string; text?: string }[] };
    const text = (j.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
    if (!text) throw new AiError("Empty response from Anthropic API.");
    return text;
  }

  if (cfg.provider === "openai" || cfg.provider === "openai-compatible") {
    const base = (cfg.baseUrl || (cfg.provider === "openai" ? "https://api.openai.com" : "")).replace(/\/+$/, "");
    if (!base) throw new AiError("Base URL is required for OpenAI-compatible endpoints.");
    const j = (await fetchJson(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model || "gpt-4o",
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    })) as { choices?: { message?: { content?: string } }[] };
    const text = j.choices?.[0]?.message?.content ?? "";
    if (!text) throw new AiError("Empty response from OpenAI-compatible API.");
    return text;
  }

  throw new AiError(`Unknown provider: ${cfg.provider}`);
}

export async function testConnection(cfg: AiConfig): Promise<void> {
  if (cfg.provider === "demo") return;
  await callAssistant(cfg, "Reply with exactly: OK");
}

function demoAnswer(prompt: string): string {
  const placeholders = [...new Set(prompt.match(/<[A-Z]+_\d+>/g) ?? [])].slice(0, 12);
  const kbHits = [...prompt.matchAll(/^- (.+?):/gm)].map((m) => m[1]).slice(0, 5);
  return `> ⚙️ **Offline demo mode** — no external call was made. Configure a real provider in Settings → AI Assistant.

**This canned answer only shows what the flow looks like.**

1) **Detected anonymized values** (these would be real values restored locally in a real answer): ${placeholders.length ? placeholders.join(", ") : "none"}

2) **Context retrieved locally from your knowledge base**: ${kbHits.length ? kbHits.join("; ") : "no matches yet — with real cases registered, the assistant would cite them here"}

3) With a real provider, this section would contain: ranked root causes tied to your log evidence, exact verification commands per vendor, the recommended fix, and next steps if it fails.`;
}
