import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Bookmark, Search, MapPin, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { getCompaniesByYear, getEvent, INDUSTRIES, COUNTRIES, SIZES, STATUSES } from "@/lib/dummy-data";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/events/$eventId/$year")({
  loader: ({ params }) => {
    const ev = getEvent(params.eventId);
    const yr = Number(params.year);
    if (!ev || !ev.years.some((y) => y.year === yr)) throw notFound();
    return { event: ev, year: yr, companies: getCompaniesByYear(params.eventId, yr) };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.event.name} ${loaderData.year} — EventIQ` }]
      : [{ title: "Year database — EventIQ" }],
  }),
  component: YearDb,
});

function YearDb() {
  const { event, year, companies } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("All");
  const [country, setCountry] = useState("All");
  const [size, setSize] = useState("All");
  const [service, setService] = useState("All");
  const [status, setStatus] = useState("All");

  const filtered = useMemo(() => {
    return companies.filter((c: any) => {
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (industry !== "All" && c.industry !== industry) return false;
      if (country !== "All" && c.country !== country) return false;
      if (size !== "All" && c.size !== size) return false;
      if (service !== "All" && c.serviceCategory !== service) return false;
      if (status !== "All" && c.status !== status) return false;
      return true;
    });
  }, [companies, q, industry, country, size, service, status]);

  return (
    <PageShell>
      {/* Breadcrumb */}
      <div className="mb-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Events</Link>
        <span className="mx-2">/</span>
        <Link to="/events/$eventId" params={{ eventId: event.slug }} className="hover:text-foreground">{event.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{year}</span>
      </div>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {event.name} <span className="text-muted-foreground">·</span> {year}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {companies.length.toLocaleString()} companies in this database.
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="mb-8 space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search companies..."
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect label="Industry" value={industry} onChange={setIndustry} options={["All", ...INDUSTRIES]} />
          <FilterSelect label="Country" value={country} onChange={setCountry} options={["All", ...COUNTRIES]} />
          <FilterSelect label="Size" value={size} onChange={setSize} options={["All", ...SIZES]} />
          <FilterSelect label="Service" value={service} onChange={setService} options={["All", "Professional Services", "Technology", "Advisory", "Platform"]} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={["All", ...STATUSES]} />
        </div>
      </div>

      {/* Companies grid */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-16 text-center">
          <div className="text-lg font-semibold">No companies match your filters</div>
          <div className="mt-1 text-sm text-muted-foreground">Try clearing a filter or adjusting your search.</div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c: any, idx: number) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx, 12) * 0.02 }}
              className="group flex flex-col rounded-3xl border border-border bg-card p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-sm font-semibold text-navy dark:text-sky">
                    {c.logo}
                  </div>
                  <div>
                    <div className="font-semibold leading-tight">{c.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {c.country}
                    </div>
                  </div>
                </div>
                <button
                  aria-label="Bookmark"
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-navy"
                >
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Meta k="Industry" v={c.industry} />
                <Meta k="Employees" v={c.employees} />
                <Meta k="Service" v={c.primaryService} />
                <Meta k="Website" v={c.website} />
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {c.contacts.length} contacts
                </div>
                <Link
                  to="/companies/$companyId"
                  params={{ companyId: c.id }}
                  className="rounded-full bg-navy px-3.5 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                >
                  View Company
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-soft">
      <span className="font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent font-medium focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-0.5 truncate font-medium">{v}</div>
    </div>
  );
}
