import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, schema, eq, desc } from "@/lib/db";
import { getOrgForUser } from "@/lib/org";
import { formatDate } from "@/lib/utils";
import { UploadForm } from "@/components/portal/upload-form";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return null;
  const org = await getOrgForUser(user.id);
  if (!org) return null;
  const { org: o } = org;

  const docs = await db
    .select({
      id: schema.documents.id,
      filename: schema.documents.filename,
      kind: schema.documents.kind,
      status: schema.documents.status,
      size: schema.documents.size,
      createdAt: schema.documents.createdAt,
    })
    .from(schema.documents)
    .where(eq(schema.documents.orgId, o.id))
    .orderBy(desc(schema.documents.createdAt))
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Receipts & paperwork</p>
        <h1 className="font-display text-4xl text-ink">Documents</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Drop receipts and statements here. We match them to transactions and keep them with your
          books — yours to download, any time.
        </p>
      </div>

      <UploadForm />

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono-label text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3">File</th>
              <th className="px-5 py-3">Kind</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Size</th>
              <th className="px-5 py-3">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d: { id: string; filename: string; kind: string; status: string; size: number; createdAt: Date }) => (
              <tr key={d.id} className="border-b border-line/60 last:border-0">
                <td className="max-w-[20rem] truncate px-5 py-3 text-ink">{d.filename}</td>
                <td className="px-5 py-3 text-ink-soft">{d.kind}</td>
                <td className="px-5 py-3">
                  <span
                    className={
                      d.status === "processed"
                        ? "font-mono-label text-[11px] text-signal"
                        : "font-mono-label text-[11px] text-amber-deep"
                    }
                  >
                    {d.status}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono-label text-xs text-ink-soft">
                  {(d.size / 1024).toFixed(1)} KB
                </td>
                <td className="px-5 py-3 text-ink-soft">{formatDate(d.createdAt)}</td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-ink-soft">
                  No documents yet — upload your first receipt above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
