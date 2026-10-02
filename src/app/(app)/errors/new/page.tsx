import Link from "next/link";
import { listVendors } from "@/lib/queries";
import NewErrorForm from "@/components/new-error-form";

export default async function NewErrorPage() {
  const vendors = await listVendors();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">New Error KB entry</h1>
        <Link href="/errors" className="btn btn-ghost">← Error KB</Link>
      </div>
      <div className="panel p-5">
        <NewErrorForm vendors={vendors.map((v) => ({ id: v.id, name: v.name }))} />
      </div>
    </div>
  );
}
