import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, CalendarOff } from "lucide-react";
import { getAllCompanies, getFacets, getEventsList, type Company } from "@/lib/data";
import { PageShell } from "@/components/page-shell";
import { SearchableSelect } from "@/components/searchable-select";

const NO_EVENT = "__none__";

export const Route = createFileRoute("/companies/")({
  loader: async () => {
    const [all, facets, events] = await Promise.all([
      getAllCompanies(),
      getFacets(),
      getEventsList(),
    ]);
    return { all, industries: facets.industries, countries: facets.countries, events };
  },
  component: CompaniesIndex,
  head: () => ({ meta: [{ title: "Companies — EventIQ" }] }),
});

function CompaniesIndex() {
  const { all, industries, countries, events } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("All");
  const [country, setCountry] = useState("All");
  const [event, setEvent] = useState("All");
  const [grouped, setGrouped] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 30;

  const filtered = useMemo(() => {
    return all.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (industry !== "All" && c.industry !== industry) return false;
      if (country !== "All" && c.country !== country) return false;
      if (event === NO_EVENT && c.eventParticipation.length > 0) return false;
      if (event !== "All" && event !== NO_EVENT && !c.eventParticipation.some((p) => p.slug === event))
        return false;
      return true;
    });
  }, [all, q, industry, country, event]);

  useEffect(() => setPage(1), [q, industry, country, event, grouped]);

  const noEventCount = useMemo(() => all.filter((c) => c.eventParticipation.length === 0).length, [all]);

  return (
    <PageShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky">Directory</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">All Companies</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {all.length.toLocaleString()} companies · {noEventCount.toLocaleString()} not linked to any event.
          </p>
        </div>
        <Link
          to="/companies/new"
          className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add Company
        </Link>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies..." className="w-full bg-transparent text-sm focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <SearchableSelect label="Event" value={event} onChange={setEvent} options={[{ value: "All", label: "All" }, { value: NO_EVENT, label: "No event" }, ...events.map((e) => ({ value: e.slug, label: e.name }))]} />
          <SearchableSelect label="Industry" value={industry} onChange={setIndustry} options={["All", ...industries].map((o) => ({ value: o, label: o }))} />
          <SearchableSelect label="Country" value={country} onChange={setCountry} options={["All", ...countries].map((o) => ({ value: o, label: o }))} />
          <button
            onClick={() => setGrouped((g) => !g)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition sm:ml-auto ${
              grouped ? "border-navy bg-navy text-white" : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            Group by event
          </button>
        </div>
      </div>

      {grouped ? (
        <GroupedByEvent companies={filtered} events={events} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {filtered.slice(0, page * perPage).map((c, i) => (
              <CompanyCard key={c.id} c={c} i={i} />
            ))}
          </div>
          {page * perPage < filtered.length && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium shadow-soft transition hover:bg-secondary"
              >
                Load more ({(filtered.length - page * perPage).toLocaleString()} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

function GroupedByEvent({
  companies,
  events,
}: {
  companies: Company[];
  events: { slug: string; name: string }[];
}) {
  const sections = events
    .map((e) => ({
      key: e.slug,
      name: e.name,
      items: companies.filter((c) => c.eventParticipation.some((p) => p.slug === e.slug)),
    }))
    .filter((s) => s.items.length > 0);
  const noEvent = companies.filter((c) => c.eventParticipation.length === 0);

  return (
    <div className="space-y-10">
      {sections.map((s) => (
        <section key={s.key}>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">{s.name}</h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{s.items.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {s.items.map((c, i) => <CompanyCard key={c.id} c={c} i={i} />)}
          </div>
        </section>
      ))}
      {noEvent.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <CalendarOff className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">No event</h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{noEvent.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {noEvent.map((c, i) => <CompanyCard key={c.id} c={c} i={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function CompanyCard({ c, i }: { c: Company; i: number }) {
  const uniqueEvents = Array.from(new Map(c.eventParticipation.map((p) => [p.slug, p])).values());
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 20) * 0.01 }}>
      <Link
        to="/companies/$companyId"
        params={{ companyId: c.id }}
        className="block h-full rounded-2xl border border-border bg-card p-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-hover sm:p-5"
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-[10px] font-semibold text-navy sm:h-10 sm:w-10 sm:rounded-xl sm:text-xs dark:text-sky">{c.logo}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold sm:text-base">{c.name}</div>
            <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{c.industry} · {c.country}</div>
          </div>
        </div>
        <p className="mt-3 hidden line-clamp-2 text-xs text-muted-foreground sm:block">{c.description}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3">
          {uniqueEvents.length === 0 ? (
            <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">No event</span>
          ) : (
            <>
              {uniqueEvents.slice(0, 2).map((p) => (
                <span key={p.slug} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {p.event}
                </span>
              ))}
              {uniqueEvents.length > 2 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  +{uniqueEvents.length - 2}
                </span>
              )}
            </>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

