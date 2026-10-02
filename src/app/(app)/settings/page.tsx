import { listClients, listTags, listTechnologies } from "@/lib/queries";
import { Panel } from "@/components/ui";
import { ChangePasswordForm, ImportForm } from "@/components/settings-forms";
import { AiConfigForm } from "@/components/ai-config-form";
import { SubmitButton } from "@/components/submit-button";
import { aiConfigured, getAiConfig } from "@/lib/ai-config";
import {
  clientCreateAction,
  clientDeleteAction,
  tagDeleteAction,
  techCreateAction,
  techDeleteAction,
} from "@/lib/actions/settings";

export default async function SettingsPage() {
  const [clients, techs, tags, cfg] = await Promise.all([
    listClients(),
    listTechnologies(),
    listTags(),
    Promise.resolve(getAiConfig()),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      <Panel title="AI Assistant">
        <AiConfigForm
          provider={cfg.provider}
          model={cfg.model}
          baseUrl={cfg.baseUrl}
          hasKey={aiConfigured()}
        />
      </Panel>

      <Panel title="Account">
        <ChangePasswordForm />
      </Panel>

      <Panel title={`Clients (${clients.length})`}>
        <form action={clientCreateAction} className="input-row mb-4">
          <input name="name" required className="field !w-56" placeholder="client name" />
          <input name="notes" className="field !w-72" placeholder="notes (optional)" />
          <SubmitButton className="btn">Add client</SubmitButton>
        </form>
        {clients.length === 0 ? (
          <p className="text-sm text-dim">No clients yet.</p>
        ) : (
          <ul className="divide-y divide-edge text-sm">
            {clients.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className="font-medium">{c.name}</span>
                <span className="truncate text-xs text-dim">{c.notes}</span>
                <span className="ml-auto font-mono text-xs text-dim">{c.case_count} cases</span>
                <form action={clientDeleteAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px] !text-red" confirm={`Delete client "${c.name}"?`}>✕</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`Technologies (${techs.length})`}>
        <form action={techCreateAction} className="input-row mb-4">
          <input name="name" required className="field !w-56" placeholder="technology" />
          <input name="category" className="field !w-56" placeholder="category (Routing, VPN…)" />
          <SubmitButton className="btn">Add technology</SubmitButton>
        </form>
        <div className="space-y-1.5">
          {Object.entries(
            techs.reduce<Record<string, typeof techs>>((acc, t) => {
              (acc[t.category] ??= []).push(t);
              return acc;
            }, {})
          ).map(([cat, list]) => (
            <div key={cat} className="flex flex-wrap items-center gap-1.5">
              <span className="label w-32 shrink-0">{cat}</span>
              {list.map((t) => (
                <span key={t.id} className="chip border-edge text-mute">
                  {t.name}
                  <form action={techDeleteAction} className="inline">
                    <input type="hidden" name="id" value={t.id} />
                    <SubmitButton className="!bg-transparent !p-0 !text-[10px] !text-red" confirm={`Delete technology "${t.name}"?`}>✕</SubmitButton>
                  </form>
                </span>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={`Tags (${tags.length})`}>
        {tags.length === 0 ? (
          <p className="text-sm text-dim">Tags are created on the fly when you file cases.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t.id} className="chip border-edge text-mute">
                #{t.name}
                <span className="text-dim">{t.case_count}</span>
                <form action={tagDeleteAction} className="inline">
                  <input type="hidden" name="id" value={t.id} />
                  <SubmitButton className="!bg-transparent !p-0 !text-[10px] !text-red" confirm={`Delete tag "${t.name}"?`}>✕</SubmitButton>
                </form>
              </span>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Backup & restore">
        <div className="space-y-3">
          <div className="input-row">
            <a className="btn" href="/api/backup?type=json" download>Download JSON export</a>
            <a className="btn" href="/api/backup?type=db" download>Download SQLite .db</a>
          </div>
          <p className="text-xs text-dim">
            The .db file is a live copy (WAL checkpointed). Store exports outside the server.
          </p>
          <div className="border-t border-edge pt-3">
            <ImportForm />
          </div>
        </div>
      </Panel>
    </div>
  );
}
