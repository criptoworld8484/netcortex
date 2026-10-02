import { listVendors } from "@/lib/queries";
import { AnalyzerForm } from "@/components/analyzer-form";

export default async function AnalyzerPage() {
  const vendors = await listVendors();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Log Analyzer</h1>
        <p className="text-sm text-dim">
          Paste a log — matched patterns rank causes by your own confirmed evidence.
        </p>
      </div>
      <AnalyzerForm vendors={vendors.map((v) => ({ id: v.id, name: v.name, slug: v.slug, color: v.color }))} />
    </div>
  );
}
