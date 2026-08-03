import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrgForUser } from "@/lib/org";

export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/signin");
  const org = await getOrgForUser(session.user.id);
  if (!org) redirect("/onboarding");
  if (!["owner", "admin"].includes(org.role)) {
    redirect("/dashboard");
  }
  return <div className="app-surface min-h-screen">{children}</div>;
}
