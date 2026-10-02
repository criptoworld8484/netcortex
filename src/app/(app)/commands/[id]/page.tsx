import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommandRef, listCommandCategories, listVendors } from "@/lib/queries";
import { CommandRefForm } from "@/components/command-ref-form";
import { SubmitButton } from "@/components/submit-button";
import { deleteCommandRefAction } from "@/lib/actions/commands";
import { MD } from "@/components/md";

export default async function CommandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const refId = Number(id);
  if (!refId || Number.isNaN(refId)) notFound();

  const data = getCommandRef(refId);
  if (!data) notFound();

  const [vendors, categories] = await Promise.all([listVendors(), listCommandCategories()]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/commands" className="btn btn-ghost">← Commands</Link>
        <form action={deleteCommandRefAction}>
          <input type="hidden" name="id" value={refId} />
          <SubmitButton className="btn btn-danger !py-1" confirm="Delete this command task?">
            delete
          </SubmitButton>
        </form>
      </div>

      <div className="panel p-5">
        <div className="mb-4">
          <h1 className="text-lg font-semibold">{data.ref.task}</h1>
          <span className="chip border-edge text-dim">{data.ref.category}</span>
        </div>
        <CommandRefForm
          mode="edit"
          refId={refId}
          task={data.ref.task}
          category={data.ref.category}
          notes={data.ref.notes}
          vendors={vendors.map((v) => ({
            id: v.id,
            name: v.name,
            color: v.color,
            command: data.entries.find((e) => e.vendor_id === v.id)?.command ?? "",
          }))}
          categories={categories.map((c) => c.category)}
        />
        {data.ref.notes && (
          <div className="mt-5 border-t border-edge pt-4">
            <span className="label mb-1 block">Notes</span>
            <MD>{data.ref.notes}</MD>
          </div>
        )}
      </div>
    </div>
  );
}
