import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { getAllCompanies } from "@/lib/data";
import { addContact } from "@/lib/server-fns";
import { invalidateData } from "@/lib/data";

export const Route = createFileRoute("/contacts/new")({
  loader: async () => {
    const companies = await getAllCompanies();
    return {
      companies: companies
        .map((c) => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
  head: () => ({ meta: [{ title: "Add Contact — EventIQ" }] }),
  component: NewContact,
});

function NewContact() {
  const { companies } = Route.useLoaderData();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyId: "", name: "", designation: "", department: "", email: "", phone: "", linkedin: "" });
  const [companyQuery, setCompanyQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const companyMatches = useMemo(() => {
    const q = companyQuery.trim().toLowerCase();
    if (!q) return companies.slice(0, 8);
    return companies.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [companies, companyQuery]);

  const selectedCompany = companies.find((c) => c.id === form.companyId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyId) return setError("Pick a company for this contact.");
    if (!form.name.trim()) return setError("Contact name is required.");
    setBusy(true);
    setError(null);
    try {
      await addContact({ data: form });
      invalidateData();
      await navigate({ to: "/companies/$companyId", params: { companyId: form.companyId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact.");
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <Link to="/contacts" className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Contacts
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Add Contact</h1>
      <p className="mt-2 text-sm text-muted-foreground">A contact belongs to a company. Pick the company, then fill in their details.</p>

      <form onSubmit={onSubmit} className="mt-8 max-w-2xl space-y-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Company <span className="text-sky">*</span></div>
          {selectedCompany ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
              <span className="font-medium">{selectedCompany.name}</span>
              <button type="button" onClick={() => setForm((f) => ({ ...f, companyId: "" }))} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
            </div>
          ) : (
            <>
              <input value={companyQuery} onChange={(e) => setCompanyQuery(e.target.value)} placeholder="Search companies…" className={inputCls} />
              {companyMatches.length > 0 && (
                <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-border">
                  {companyMatches.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setForm((f) => ({ ...f, companyId: c.id })); setCompanyQuery(""); }} className="block w-full px-3.5 py-2 text-left text-sm hover:bg-secondary">
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              <Link to="/companies/new" className="mt-2 inline-block text-xs text-sky hover:underline">Company not listed? Add it first →</Link>
            </>
          )}
        </div>

        <Field label="Full name" required><input value={form.name} onChange={set("name")} className={inputCls} placeholder="Jane Doe" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Designation"><input value={form.designation} onChange={set("designation")} className={inputCls} placeholder="Head of Partnerships" /></Field>
          <Field label="Department"><input value={form.department} onChange={set("department")} className={inputCls} placeholder="Sales" /></Field>
          <Field label="Email"><input value={form.email} onChange={set("email")} className={inputCls} placeholder="jane@acme.example" /></Field>
          <Field label="Phone"><input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="+971 50 000 0000" /></Field>
        </div>
        <Field label="LinkedIn"><input value={form.linkedin} onChange={set("linkedin")} className={inputCls} placeholder="linkedin.com/in/janedoe" /></Field>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add contact
          </button>
          <Link to="/contacts" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
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
