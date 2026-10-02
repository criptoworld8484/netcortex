import Link from "next/link";
import { listCommandCategories, listVendors } from "@/lib/queries";
import { CommandRefForm } from "@/components/command-ref-form";

export default async function NewCommandPage() {
  const [vendors, categories] = await Promise.all([listVendors(), listCommandCategories()]);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">New command task</h1>
        <Link href="/commands" className="btn btn-ghost">← Commands</Link>
      </div>
      <div className="panel p-5">
        <CommandRefForm
          mode="create"
          vendors={vendors.map((v) => ({ id: v.id, name: v.name, color: v.color }))}
          categories={categories.map((c) => c.category)}
        />
      </div>
    </div>
  );
}
