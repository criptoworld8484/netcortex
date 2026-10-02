import { redirect } from "next/navigation";
import { getSession, hasPassword } from "@/lib/auth";
import { SetupForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await getSession()) redirect("/");
  if (hasPassword()) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center font-mono">
          <div className="text-xl font-semibold tracking-tight">
            <span className="text-accent">net</span><span className="text-fg">cortex</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-dim">first-run initialization</div>
        </div>
        <div className="panel p-6">
          <p className="mb-4 text-sm text-mute">
            Create the admin password for this instance. It is stored locally (bcrypt) — there is no recovery, so keep it safe.
          </p>
          <SetupForm />
        </div>
      </div>
    </div>
  );
}
