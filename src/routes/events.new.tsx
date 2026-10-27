import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { addEvent } from "@/lib/server-fns";
import { invalidateData } from "@/lib/data";

export const Route = createFileRoute("/events/new")({
  head: () => ({ meta: [{ title: "Create Event — EventIQ" }] }),
  component: NewEvent,
});

function NewEvent() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    name: "",
    year: String(currentYear),
    location: "",
    website: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const year = Number(form.year);
    if (!form.name.trim()) {
      setError("Event name is required.");
      return;
    }
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      setError("Enter a valid year (e.g. 2026).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { slug } = await addEvent({
        data: {
          name: form.name.trim(),
          year,
          location: form.location || undefined,
          website: form.website || undefined,
          description: form.description || undefined,
        },
      });
      invalidateData();
      await navigate({ to: "/events/$eventId", params: { eventId: slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event.");
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Events
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Create Event</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add an event edition. If an event with the same name already exists, the year is added to it as a new
        edition instead of creating a duplicate.
      </p>

      <form onSubmit={onSubmit} className="mt-8 max-w-2xl space-y-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <Field label="Event name" required>
            <input value={form.name} onChange={set("name")} className={inputCls} placeholder="Dubai AI Festival" />
          </Field>
          <Field label="Year" required>
            <input
              value={form.year}
              onChange={set("year")}
              className={inputCls}
              inputMode="numeric"
              placeholder={String(currentYear)}
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Location"><input value={form.location} onChange={set("location")} className={inputCls} placeholder="Dubai, UAE" /></Field>
          <Field label="Website"><input value={form.website} onChange={set("website")} className={inputCls} placeholder="event.example.com" /></Field>
        </div>
        <Field label="Description">
          <textarea value={form.description} onChange={set("description")} rows={3} className={inputCls} placeholder="What this event is about…" />
        </Field>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create event
          </button>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
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
