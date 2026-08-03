import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrgForUser } from "@/lib/org";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/signin");

  const org = await getOrgForUser(session.user.id);
  if (!org) redirect("/onboarding");

  return (
    <PortalShell user={session.user} orgName={org.org.name} orgId={org.org.id} plan={org.org.plan} role={org.role}>
      {children}
    </PortalShell>
  );
}
