import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Bookmark, FileText, Settings } from "lucide-react";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/profile")({
  component: Profile,
  head: () => ({ meta: [{ title: "Profile — EventIQ" }] }),
});

function Profile() {
  return (
    <PageShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-card lg:col-span-1">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-navy text-2xl font-semibold text-white">AK</div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Aisha Khan</h1>
          <div className="text-sm text-muted-foreground">Head of Intelligence · Datito7</div>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2"><Mail className="h-4 w-4" /> aisha@datito7.example</div>
            <div className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> +971 000 0000</div>
            <div className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> Dubai, UAE</div>
          </div>
          <button className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium transition hover:opacity-90">
            <Settings className="h-4 w-4" /> Edit profile
          </button>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Bookmarks" icon={<Bookmark className="h-4 w-4" />}>
            <ul className="divide-y divide-border text-sm">
              {["Dubai AI Summit 2025", "Nova Advisory", "GITEX Global 2024", "Money20/20 2024"].map((x) => (
                <li key={x} className="flex items-center justify-between py-3">
                  <span className="font-medium">{x}</span>
                  <span className="text-xs text-muted-foreground">Saved</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Reports" icon={<FileText className="h-4 w-4" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {["Q4 Event Coverage Report", "AI Industry Deep-Dive", "GITEX 2024 Recap", "Global Fintech Landscape"].map((r) => (
                <div key={r} className="rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-sm font-medium">{r}</div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
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
