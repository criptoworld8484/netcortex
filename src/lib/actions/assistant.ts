"use server";

import { requireAuth } from "../auth";
import { one, run, now } from "../db";
import { anonymize, deanonymize } from "../anonymize";
import { buildRagContext, renderContextForPrompt, type RagContext } from "../rag";
import { callAssistant, AiError } from "../ai";
import { getAiConfig } from "../ai-config";

export interface PreparedDraft {
  draftId: number;
  anonymizedQuestion: string;
  anonymizedLog: string;
  mappingCount: number;
  keywords: string[];
  context: RagContext;
  prompt: string;
}

export interface AssistantAnswer {
  draftId: number;
  answer: string;
  rawAnswer: string;
  provider: string;
  model: string;
  error?: string;
}

export async function prepareAssistantAction(
  _prev: { draft?: PreparedDraft; error?: string },
  fd: FormData
): Promise<{ draft?: PreparedDraft; error?: string }> {
  await requireAuth();
  const question = String(fd.get("question") ?? "").trim();
  const log = String(fd.get("log") ?? "").trim();
  if (!question && !log) return { error: "Describe the problem or paste a log first." };

  const anonQ = anonymize(question);
  const anonLog = anonymize(log);
  const mapping = { ...anonQ.mapping, ...anonLog.mapping };

  const ctx = buildRagContext(question, log);
  const contextBlock = renderContextForPrompt(ctx);

  const prompt = [
    contextBlock ? `## Context from my knowledge base\n${contextBlock}` : "",
    "## Current incident",
    anonQ.text ? `Symptom / question:\n${anonQ.text}` : "",
    anonLog.text ? `Log (anonymized):\n\`\`\`\n${anonLog.text}\n\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const draftId = run(
    "INSERT INTO assistant_drafts (question, log, mapping, prompt, created_at) VALUES (?, ?, ?, ?, ?)",
    question, log, JSON.stringify(mapping), prompt, now()
  ).id;

  return {
    draft: {
      draftId,
      anonymizedQuestion: anonQ.text,
      anonymizedLog: anonLog.text,
      mappingCount: Object.keys(mapping).length,
      keywords: ctx.keywords,
      context: ctx,
      prompt,
    },
  };
}

export async function sendAssistantAction(
  _prev: AssistantAnswer | null,
  fd: FormData
): Promise<AssistantAnswer | null> {
  await requireAuth();
  const draftId = Number(fd.get("draftId"));
  if (!draftId) return { draftId: 0, answer: "", rawAnswer: "", provider: "", model: "", error: "No draft prepared." };

  const draft = one<{ prompt: string; mapping: string }>(
    "SELECT prompt, mapping FROM assistant_drafts WHERE id = ?",
    draftId
  );
  if (!draft) return { draftId, answer: "", rawAnswer: "", provider: "", model: "", error: "Draft not found — prepare again." };

  const cfg = getAiConfig();
  try {
    const raw = await callAssistant(cfg, draft.prompt);
    let mapping: Record<string, string> = {};
    try {
      mapping = JSON.parse(draft.mapping) as Record<string, string>;
    } catch { /* empty mapping */ }
    return {
      draftId,
      rawAnswer: raw,
      answer: deanonymize(raw, mapping),
      provider: cfg.provider,
      model: cfg.model || "(default)",
    };
  } catch (e) {
    const msg = e instanceof AiError ? e.message : e instanceof Error ? e.message : "Unknown error";
    return { draftId, answer: "", rawAnswer: "", provider: cfg.provider, model: cfg.model, error: msg };
  }
}
