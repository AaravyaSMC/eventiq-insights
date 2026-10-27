import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, FileText, Sparkles, Calendar, Building2, Users, Globe, LogOut } from "lucide-react";
import { getStats } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/profile")({
  loader: async () => ({ stats: await getStats() }),
  component: Profile,
  head: () => ({ meta: [{ title: "Profile — EventIQ" }] }),
});

function Profile() {
  const { stats } = Route.useLoaderData();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return (
    <PageShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8 lg:col-span-1">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-navy text-white">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">SandMartin</h1>
          <div className="text-sm text-muted-foreground">EventIQ Workspace</div>
          {email && <div className="mt-1 truncate text-xs text-muted-foreground">Signed in as {email}</div>}
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <dl className="mt-6 space-y-3 text-sm">
            <WorkspaceStat icon={<Calendar className="h-4 w-4" />} label="Events" value={stats.totalEvents} />
            <WorkspaceStat icon={<Building2 className="h-4 w-4" />} label="Companies" value={stats.totalCompanies} />
            <WorkspaceStat icon={<Users className="h-4 w-4" />} label="Contacts" value={stats.totalContacts} />
            <WorkspaceStat icon={<Globe className="h-4 w-4" />} label="Countries" value={stats.totalCountries} />
          </dl>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Bookmarks" icon={<Bookmark className="h-4 w-4" />}>
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No bookmarks yet. Saved events and companies will appear here.
            </div>
          </Card>
          <Card title="Reports" icon={<FileText className="h-4 w-4" />}>
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No reports yet. Generated reports will appear here.
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function WorkspaceStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="inline-flex items-center gap-2 text-muted-foreground">{icon} {label}</dt>
      <dd className="font-semibold">{value.toLocaleString()}</dd>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-7">
      <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
