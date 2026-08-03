import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, schema, eq } from "@/lib/db";
import { getOrgForUser } from "@/lib/org";
import { ProfileForm, DangerZone } from "@/components/portal/settings-forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return null;
  const org = await getOrgForUser(user.id);
  if (!org) return null;
  const { org: o, role } = org;

  const members = await db
    .select({
      name: schema.users.name,
      email: schema.users.email,
      role: schema.memberships.role,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.orgId, o.id));

  const businessType = (o.settings?.businessType as string | undefined) ?? "trades";

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Settings</p>
        <h1 className="font-display text-4xl text-ink">Your business</h1>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-ink">Profile</h2>
        <p className="mt-1 text-sm text-ink-soft">Your reviewer uses this to keep your books in shape.</p>
        <div className="mt-5 max-w-md">
          <ProfileForm name={o.name} businessType={businessType} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-ink">People</h2>
        <div className="mt-4 space-y-3">
          {members.map((m: { name: string; email: string; role: string }) => (
            <div key={m.email} className="flex items-center justify-between border-b border-line/60 pb-3 last:border-0">
              <div>
                <p className="font-medium text-ink">{m.name || m.email}</p>
                <p className="text-sm text-ink-soft">{m.email}</p>
              </div>
              <span className="rounded-full border border-line px-3 py-1 font-mono-label text-[11px] text-ink-soft">
                {m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : "Read-only"}
              </span>
            </div>
          ))}
          <p className="text-sm text-ink-soft">
            Read-only access for your external bookkeeper or employee is available on Pro.
          </p>
        </div>
      </div>

      <DangerZone role={role} />
    </div>
  );
}
