import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import {
  Globe, MapPin, Building2, Linkedin, Mail, Phone, FileText, Bookmark, ArrowLeft,
  ChevronLeft, ChevronRight, Sparkles, Loader2, Trash2, Download, Paperclip, Plus, X,
} from "lucide-react";
import {
  getAllCompanies, getCompany, getCompanyNotes, getCompanyAttachments, invalidateData,
  type Company, type CompanyNote, type CompanyAttachment,
} from "@/lib/data";
import {
  addCompanyNote, deleteCompanyNote, uploadAttachment, deleteAttachment, getAttachmentUrl,
} from "@/lib/server-fns";
import { enrichCompany, applyEnrichment, type EnrichmentProposal } from "@/lib/ai-fns";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/companies/$companyId")({
  loader: async ({ params }) => {
    const c = await getCompany(params.companyId);
    if (!c) throw notFound();
    const [related, notes, attachments] = await Promise.all([
      getAllCompanies().then((all) =>
        all.filter((x) => x.industry === c.industry && x.id !== c.id).slice(0, 8),
      ),
      getCompanyNotes(c.id),
      getCompanyAttachments(c.id),
    ]);
    return { company: c, related, notes, attachments };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.company.name} — EventIQ` },
          { name: "description", content: loaderData.company.description },
        ]
      : [{ title: "Company — EventIQ" }],
  }),
  component: CompanyProfile,
});

function CompanyProfile() {
  const { company: c, related, notes, attachments } = Route.useLoaderData();

  return (
    <PageShell>
      {/* Back */}
      <BackButton />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-10"
      >
        {/* Identity row: logo + name/status + bookmark. Everything else stacks below. */}
        <div className="flex items-start gap-3 sm:gap-6">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-navy text-lg font-semibold text-white shadow-soft sm:h-20 sm:w-20 sm:text-2xl">
            {c.logo}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">{c.name}</h1>
            <span className="mt-1.5 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {c.status}
            </span>
          </div>
          <button aria-label="Bookmark" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border transition hover:bg-secondary sm:h-10 sm:w-10">
            <Bookmark className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:text-sm">
          <span className="inline-flex max-w-full items-center gap-1.5"><Globe className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{c.website}</span></span>
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /> {c.country}</span>
          <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 shrink-0" /> {c.industry}</span>
        </div>

        <p className="mt-3 max-w-3xl text-justify text-sm text-muted-foreground sm:mt-4 sm:text-base">{c.description}</p>

        {c.website !== "—" && (
          <a
            href={/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center rounded-full bg-navy px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Visit Website
          </a>
        )}
      </motion.div>

      {/* AI enrichment */}
      <EnrichSection company={c} />

      {/* Two column */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Company Overview">
            <p className="text-justify text-sm text-muted-foreground">{c.description}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <KV k="Founded" v={String(c.founded)} />
              <KV k="Headquarters" v={c.headquarters} />
              <KV k="Employees" v={c.employees} />
              <KV k="Revenue" v={c.revenue} />
              {c.eventParticipation.length > 0 && <KV k="Source" v={sourceLabel(c)} />}
            </dl>
          </Section>

          <Section title="Services">
            <div className="flex flex-wrap gap-2">
              {c.services.length === 0 && <span className="text-sm text-muted-foreground">No services recorded yet.</span>}
              {c.services.map((s: string) => (
                <span key={s} className="rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium">
                  {s}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Business Details">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <KV k="Target Market" v={c.targetMarket} />
              <KV k="Business Model" v={c.businessModel} />
              <KV k="Ownership" v={c.ownership} />
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">LinkedIn</dt>
                <dd className="mt-1 text-sm font-medium">
                  {c.linkedin !== "—" ? (
                    <a
                      href={/^https?:\/\//.test(c.linkedin) ? c.linkedin : `https://${c.linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-navy hover:underline dark:text-sky"
                    >
                      <Linkedin className="h-3.5 w-3.5" /> View on LinkedIn
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <KV k="Countries Served" v={c.countriesServed.slice(0, 4).join(", ") + (c.countriesServed.length > 4 ? "…" : "")} />
              <KV k="Primary Service" v={c.primaryService} />
            </dl>
          </Section>

          <Section title="Event Participation">
            {c.eventParticipation.length === 0 ? (
              <div className="text-sm text-muted-foreground">Not linked to any event.</div>
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-6">
                {c.eventParticipation.map((p, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1.5 grid h-3 w-3 place-items-center rounded-full bg-sky ring-4 ring-background" />
                    <div className="text-sm font-medium">{p.event} <span className="text-muted-foreground">· {p.year}</span></div>
                    <div className="text-xs text-muted-foreground">Participated</div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <NotesSection companyId={c.id} notes={notes} />
          <AttachmentsSection companyId={c.id} attachments={attachments} />
        </div>

        {/* Contacts */}
        <aside className="space-y-6">
          <Section title="Contacts">
            {c.contacts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No contacts yet. Scan a business card or add one manually.
              </div>
            ) : (
              <div className="space-y-3">
                {c.contacts.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-xs font-semibold">
                        {p.name.split(" ").map((w: string) => w[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{p.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.designation}</div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
                      <div className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" /> {p.email}</div>
                      <div className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" /> {p.phone}</div>
                      <div className="inline-flex items-center gap-1.5"><Linkedin className="h-3 w-3" /> {p.linkedin}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </aside>
      </div>

      {/* Related */}
      {related.length > 0 && <RelatedCompanies related={related} />}
    </PageShell>
  );
}

function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.history.back()}
      className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}

// ----- AI enrichment -----
function EnrichSection({ company }: { company: Company }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"fetch" | "apply" | null>(null);
  const [proposal, setProposal] = useState<EnrichmentProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onEnrich() {
    setBusy("fetch");
    setError(null);
    try {
      const res = await enrichCompany({ data: { companyId: company.id } });
      setProposal(res.proposal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrichment failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onApply() {
    if (!proposal) return;
    setBusy("apply");
    setError(null);
    try {
      await applyEnrichment({
        data: {
          companyId: company.id,
          fields: {
            description: proposal.description,
            industry: proposal.industry,
            services: proposal.services,
            primaryService: proposal.primaryService,
            businessModel: proposal.businessModel,
            targetMarket: proposal.targetMarket,
            headquarters: proposal.headquarters,
            foundedYear: proposal.foundedYear,
            employeesRange: proposal.employeesRange,
            linkedin: proposal.linkedin,
          },
          summaryNote: proposal.summaryNote,
        },
      });
      setProposal(null);
      invalidateData();
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed.");
    } finally {
      setBusy(null);
    }
  }

  const rows: Array<{ label: string; current: string; proposed: string | null }> = proposal
    ? [
        { label: "Description", current: company.description, proposed: proposal.description },
        { label: "Industry", current: company.industry, proposed: proposal.industry },
        { label: "Services", current: company.services.join(", ") || "—", proposed: proposal.services.join(", ") || null },
        { label: "Primary Service", current: company.primaryService, proposed: proposal.primaryService },
        { label: "Business Model", current: company.businessModel, proposed: proposal.businessModel },
        { label: "Target Market", current: company.targetMarket, proposed: proposal.targetMarket },
        { label: "Headquarters", current: company.headquarters, proposed: proposal.headquarters },
        { label: "Founded", current: company.founded ? String(company.founded) : "—", proposed: proposal.foundedYear ? String(proposal.foundedYear) : null },
        { label: "Employees", current: company.employees, proposed: proposal.employeesRange },
        { label: "LinkedIn", current: company.linkedin, proposed: proposal.linkedin },
      ]
    : [];

  return (
    <div className="mt-4">
      {!proposal && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onEnrich}
            disabled={busy === "fetch"}
            className="inline-flex items-center gap-2 rounded-full border border-sky/40 bg-sky/10 px-4 py-2 text-sm font-medium text-navy transition hover:bg-sky/20 disabled:opacity-60 dark:text-sky"
          >
            {busy === "fetch" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy === "fetch" ? "Reading website…" : "Enrich from website"}
          </button>
          {busy === "fetch" && (
            <span className="text-xs text-muted-foreground">Claude is reading {company.website} — takes up to a minute.</span>
          )}
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
        </div>
      )}

      {proposal && (
        <div className="rounded-3xl border border-sky/40 bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-sky" /> Proposed updates from the website
            </div>
            <button onClick={() => setProposal(null)} aria-label="Discard" className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-4 font-semibold">Field</th>
                  <th className="pb-2 pr-4 font-semibold">Current</th>
                  <th className="pb-2 font-semibold">Proposed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.label} className={r.proposed == null ? "opacity-40" : ""}>
                    <td className="py-2 pr-4 font-medium">{r.label}</td>
                    <td className="max-w-[220px] py-2 pr-4 text-muted-foreground">{r.current}</td>
                    <td className="max-w-[280px] py-2 font-medium text-navy dark:text-sky">{r.proposed ?? "no change"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {proposal.summaryNote && (
            <div className="mt-4 rounded-2xl bg-secondary/60 p-4 text-sm">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Will be saved as an internal note</div>
              <div className="whitespace-pre-wrap">{proposal.summaryNote}</div>
            </div>
          )}
          {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={onApply}
              disabled={busy === "apply"}
              className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {busy === "apply" && <Loader2 className="h-4 w-4 animate-spin" />} Apply updates
            </button>
            <button onClick={() => setProposal(null)} className="text-sm text-muted-foreground hover:text-foreground">Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Notes -----
function NotesSection({ companyId, notes }: { companyId: string; notes: CompanyNote[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAdd() {
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addCompanyNote({ data: { companyId, body: draft.trim() } });
      setDraft("");
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    await deleteCompanyNote({ data: { id } });
    await router.invalidate();
  }

  return (
    <Section title="Notes">
      <div className="space-y-3">
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Add context, next steps, observations…"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky/40"
          />
          <button
            onClick={onAdd}
            disabled={busy || !draft.trim()}
            aria-label="Add note"
            className="grid h-10 w-10 shrink-0 place-items-center self-end rounded-full bg-navy text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No notes yet.
          </div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="group rounded-2xl border border-border bg-secondary/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">{n.body}</div>
                <button
                  onClick={() => onDelete(n.id)}
                  aria-label="Delete note"
                  className="shrink-0 text-muted-foreground opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}

// ----- Attachments -----
function formatBytes(n: number | null): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentsSection({ companyId, attachments }: { companyId: string; attachments: CompanyAttachment[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("File too large (max 25 MB).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(file);
      });
      await uploadAttachment({ data: { companyId, fileName: file.name, dataUrl } });
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(id: string) {
    const { url } = await getAttachmentUrl({ data: { id } });
    window.open(url, "_blank", "noopener");
  }

  async function onDelete(id: string) {
    await deleteAttachment({ data: { id } });
    await router.invalidate();
  }

  return (
    <Section title="Attachments">
      <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
      <div className="space-y-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          {busy ? "Uploading…" : "Upload file"}
        </button>
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        {attachments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <FileText className="h-5 w-5" />
            No attachments yet. Brochures, proposals, card photos — up to 25 MB each.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.fileName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatBytes(a.sizeBytes)} · {new Date(a.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </div>
                </div>
                <button onClick={() => onDownload(a.id)} aria-label="Download" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                  <Download className="h-4 w-4" />
                </button>
                <button onClick={() => onDelete(a.id)} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function RelatedCompanies({ related }: { related: Company[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const nudge = (dir: number) => scroller.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  return (
    <section className="mt-14">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Related Companies</h2>
          <span className="text-sm text-muted-foreground">Same industry</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => nudge(-1)}
            aria-label="Scroll left"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => nudge(1)}
            aria-label="Scroll right"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {related.map((r) => (
          <Link
            key={r.id}
            to="/companies/$companyId"
            params={{ companyId: r.id }}
            className="w-64 shrink-0 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-1 hover:shadow-hover"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-xs font-semibold">{r.logo}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.country}</div>
              </div>
            </div>
            <div className="mt-3 line-clamp-2 text-xs text-muted-foreground">{r.description}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// "Dubai AI Festival (2024, 2025) · WOFA (2025)" — events the company was met at.
function sourceLabel(c: Company): string {
  const byEvent = new Map<string, number[]>();
  for (const p of c.eventParticipation) {
    byEvent.set(p.event, [...(byEvent.get(p.event) ?? []), p.year]);
  }
  return Array.from(byEvent.entries())
    .map(([event, years]) => `${event} (${[...new Set(years)].sort().join(", ")})`)
    .join(" · ");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-card sm:p-7">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky">{title}</div>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="mt-1 text-justify text-sm font-medium">{v}</dd>
    </div>
  );
}
