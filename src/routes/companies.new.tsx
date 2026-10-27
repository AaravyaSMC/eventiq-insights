import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { addCompany } from "@/lib/server-fns";
import { getEventsList, invalidateData } from "@/lib/data";

export const Route = createFileRoute("/companies/new")({
  loader: async () => ({ events: await getEventsList() }),
  head: () => ({ meta: [{ title: "Add Company — EventIQ" }] }),
  component: NewCompany,
});

const INDEPENDENT = "independent";

function NewCompany() {
  const { events } = Route.useLoaderData();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", website: "", country: "", industry: "", linkedin: "", description: "" });
  const [source, setSource] = useState(INDEPENDENT); // "independent" or "slug:year"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One option per event edition, newest years first.
  const editions = events.flatMap((e) =>
    [...e.years].sort((a, b) => b - a).map((year) => ({ value: `${e.slug}:${year}`, label: `${e.name} — ${year}` })),
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Company name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let eventSlug: string | undefined;
      let eventYear: number | undefined;
      if (source !== INDEPENDENT) {
        const sep = source.lastIndexOf(":");
        eventSlug = source.slice(0, sep);
        eventYear = Number(source.slice(sep + 1));
      }
      const { id } = await addCompany({ data: { ...form, eventSlug, eventYear } });
      invalidateData();
      await navigate({ to: "/companies/$companyId", params: { companyId: id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add company.");
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <Link to="/companies" className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Companies
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Add Company</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create a company and optionally link it to the event where you met them.
      </p>

      <form onSubmit={onSubmit} className="mt-8 max-w-2xl space-y-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
        <Field label="Company name" required><input value={form.name} onChange={set("name")} className={inputCls} placeholder="Acme Analytics" /></Field>
        <Field label="Source">
          <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
            <option value={INDEPENDENT}>Independent — not from an event</option>
            {editions.map((ed) => (
              <option key={ed.value} value={ed.value}>{ed.label}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Website"><input value={form.website} onChange={set("website")} className={inputCls} placeholder="acme.example.com" /></Field>
          <Field label="LinkedIn"><input value={form.linkedin} onChange={set("linkedin")} className={inputCls} placeholder="linkedin.com/company/acme" /></Field>
          <Field label="Country"><input value={form.country} onChange={set("country")} className={inputCls} placeholder="United Arab Emirates" /></Field>
          <Field label="Industry"><input value={form.industry} onChange={set("industry")} className={inputCls} placeholder="Technology" /></Field>
        </div>
        <Field label="Description"><textarea value={form.description} onChange={set("description")} rows={3} className={inputCls} placeholder="What the company does…" /></Field>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create company
          </button>
          <Link to="/companies" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
        </div>
      </form>
    </PageShell>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky/40";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-sky"> *</span>}
      </div>
      {children}
    </label>
  );
}
