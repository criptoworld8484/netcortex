import { aiConfigured, getAiConfig } from "@/lib/ai-config";
import { AssistantForm } from "@/components/assistant-form";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ log?: string }>;
}) {
  const sp = await searchParams;
  const cfg = getAiConfig();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">AI Assistant</h1>
        <p className="text-sm text-dim">
          Your knowledge base + the log, anonymized, reviewed by you — then sent to the model.
        </p>
      </div>
      <AssistantForm
        prefillLog={sp.log ?? ""}
        provider={cfg.provider}
        model={cfg.model}
        hasKey={aiConfigured()}
      />
    </div>
  );
}
