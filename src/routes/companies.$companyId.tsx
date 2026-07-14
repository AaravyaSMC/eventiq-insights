import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Globe, MapPin, Building2, Linkedin, Mail, Phone, FileText, Bookmark } from "lucide-react";
import { getAllCompanies, getCompany } from "@/lib/dummy-data";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/companies/$companyId")({
  loader: ({ params }) => {
    const c = getCompany(params.companyId);
    if (!c) throw notFound();
    const related = getAllCompanies()
      .filter((x) => x.industry === c.industry && x.id !== c.id)
      .slice(0, 8);
    return { company: c, related };
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
  const { company: c, related } = Route.useLoaderData();

  return (
    <PageShell>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-10"
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-navy text-2xl font-semibold text-white shadow-soft">
            {c.logo}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{c.name}</h1>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                {c.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> {c.website}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {c.country}</span>
              <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {c.industry}</span>
            </div>
            <p className="mt-4 max-w-3xl text-sm text-muted-foreground sm:text-base">{c.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-full border border-border transition hover:bg-secondary">
              <Bookmark className="h-4 w-4" />
            </button>
            <a
              href="#"
              className="rounded-full bg-navy px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Visit Website
            </a>
          </div>
        </div>
      </motion.div>

      {/* Two column */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Company Overview">
            <p className="text-sm text-muted-foreground">{c.description}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <KV k="Founded" v={String(c.founded)} />
              <KV k="Headquarters" v={c.headquarters} />
              <KV k="Employees" v={c.employees} />
              <KV k="Revenue" v={c.revenue} />
            </dl>
          </Section>

          <Section title="Services">
            <div className="flex flex-wrap gap-2">
              {c.services.map((s: string) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium"
                >
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
              <KV k="LinkedIn" v={c.linkedin} />
              <KV k="Countries Served" v={c.countriesServed.slice(0, 4).join(", ") + (c.countriesServed.length > 4 ? "…" : "")} />
              <KV k="Primary Service" v={c.primaryService} />
            </dl>
          </Section>

          <Section title="Event Participation">
            <ol className="relative space-y-4 border-l border-border pl-6">
              {c.eventParticipation.map((p: any, i: number) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] top-1.5 grid h-3 w-3 place-items-center rounded-full bg-sky ring-4 ring-background" />
                  <div className="text-sm font-medium">{p.event} <span className="text-muted-foreground">· {p.year}</span></div>
                  <div className="text-xs text-muted-foreground">Participated · Verified attendee</div>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Notes">
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Internal notes appear here. Add context, next steps, and observations.
            </div>
          </Section>

          <Section title="Attachments">
            <div className="grid gap-3 sm:grid-cols-2">
              {["Company Brochure.pdf", "Business Card.png", "Case Study.pdf", "Product Sheet.pdf"].map((f) => (
                <div key={f} className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/50 px-4 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-background">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-sm">
                    <div className="truncate font-medium">{f}</div>
                    <div className="text-xs text-muted-foreground">Placeholder attachment</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Contacts */}
        <aside className="space-y-6">
          <Section title="Contacts">
            <div className="space-y-3">
              {c.contacts.map((p: any) => (
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
          </Section>
        </aside>
      </div>

      {/* Related */}
      <section className="mt-14">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Related Companies</h2>
          <div className="text-sm text-muted-foreground">Same industry</div>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-4">
            {related.map((r: any) => (
              <Link
                key={r.id}
                to="/companies/$companyId"
                params={{ companyId: r.id }}
                className="w-64 shrink-0 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-1 hover:shadow-hover"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-xs font-semibold">
                    {r.logo}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.country}</div>
                  </div>
                </div>
                <div className="mt-3 line-clamp-2 text-xs text-muted-foreground">{r.description}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-7">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky">{title}</div>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="mt-1 text-sm font-medium">{v}</dd>
    </div>
  );
}
