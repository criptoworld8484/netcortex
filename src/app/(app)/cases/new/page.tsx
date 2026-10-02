import Link from "next/link";
import { listClients, listTechnologies, listVendors } from "@/lib/queries";
import { CaseForm } from "@/components/case-form";

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ log?: string; vendor?: string; title?: string }>;
}) {
  const sp = await searchParams;
  const [clients, vendors, techs] = await Promise.all([listClients(), listVendors(), listTechnologies()]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">New case</h1>
        <Link href="/cases" className="btn btn-ghost">← Cases</Link>
      </div>
      <div className="panel p-5">
        <CaseForm
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          vendors={vendors.map((v) => ({ id: v.id, name: v.name, slug: v.slug, color: v.color }))}
          techs={techs.map((t) => ({ id: t.id, name: t.name, category: t.category }))}
          prefillLog={sp.log ?? ""}
          prefillVendor={sp.vendor ?? ""}
          prefillTitle={sp.title ?? ""}
        />
      </div>
    </div>
  );
}
