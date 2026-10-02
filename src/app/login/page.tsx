import { redirect } from "next/navigation";
import { getSession, hasPassword } from "@/lib/auth";
import { LoginForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  if (!hasPassword()) redirect("/setup");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center font-mono">
          <div className="text-xl font-semibold tracking-tight">
            <span className="text-accent">net</span><span className="text-fg">cortex</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-dim">network troubleshooting brain</div>
        </div>
        <div className="panel p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
