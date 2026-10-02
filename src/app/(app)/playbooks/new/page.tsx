import Link from "next/link";
import { NewPlaybookForm } from "@/components/new-playbook-form";

export default function NewPlaybookPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">New playbook</h1>
        <Link href="/playbooks" className="btn btn-ghost">← Playbooks</Link>
      </div>
      <div className="panel p-5">
        <NewPlaybookForm />
      </div>
    </div>
  );
}
