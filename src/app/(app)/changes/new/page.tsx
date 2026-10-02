import Link from "next/link";
import { listClients, listTechnologies, listVendors } from "@/lib/queries";
import { ChangeForm } from "@/components/change-form";

export default async function NewChangePage() {
  const [clients, vendors, techs] = await Promise.all([listClients(), listVendors(), listTechnologies()]);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">New change</h1>
        <Link href="/changes" className="btn btn-ghost">← Changes</Link>
      </div>
      <div className="panel p-5">
        <ChangeForm
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          vendors={vendors.map((v) => ({ id: v.id, name: v.name, color: v.color }))}
          techs={techs.map((t) => ({ id: t.id, name: t.name, category: t.category }))}
        />
      </div>
    </div>
  );
}
