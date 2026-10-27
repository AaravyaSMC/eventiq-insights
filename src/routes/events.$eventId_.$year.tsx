import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Bookmark, Search, MapPin, Users, Mail, Phone, Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { getCompaniesByYear, getContactsByYear, getEvent } from "@/lib/data";
import { PageShell } from "@/components/page-shell";
import { SearchableSelect } from "@/components/searchable-select";

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.filter((v) => v && v !== "—"))).sort((a, b) => a.localeCompare(b));

export const Route = createFileRoute("/events/$eventId_/$year")({
  loader: async ({ params }) => {
    const ev = await getEvent(params.eventId);
    const yr = Number(params.year);
    if (!ev || !ev.years.some((y) => y.year === yr)) throw notFound();
    const companies = await getCompaniesByYear(params.eventId, yr);
    const contacts = await getContactsByYear(params.eventId, yr);
    const facets = {
      industries: uniqueSorted(companies.map((c) => c.industry)),
      countries: uniqueSorted(companies.map((c) => c.country)),
      sizes: uniqueSorted(companies.map((c) => c.size)),
      services: uniqueSorted(companies.map((c) => c.serviceCategory)),
      statuses: uniqueSorted(companies.map((c) => c.status)),
    };
    return { event: ev, year: yr, companies, contacts, facets };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.event.name} ${loaderData.year} — EventIQ` }]
      : [{ title: "Year database — EventIQ" }],
  }),
  component: YearDb,
});

function YearDb() {
  const { event, year, companies, contacts, facets } = Route.useLoaderData();
  const [view, setView] = useState<"companies" | "contacts">("companies");
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("All");
  const [country, setCountry] = useState("All");
  const [size, setSize] = useState("All");
  const [service, setService] = useState("All");
  const [status, setStatus] = useState("All");

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (industry !== "All" && c.industry !== industry) return false;
      if (country !== "All" && c.country !== country) return false;
      if (size !== "All" && c.size !== size) return false;
      if (service !== "All" && c.serviceCategory !== service) return false;
      if (status !== "All" && c.status !== status) return false;
      return true;
    });
  }, [companies, q, industry, country, size, service, status]);

  const filteredContacts = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.companyName.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.designation.toLowerCase().includes(query),
    );
  }, [contacts, q]);

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
            {companies.length.toLocaleString()} companies · {contacts.length.toLocaleString()} contacts in this database.
          </p>
        </div>
      </div>

      {/* View toggle: Companies / Contacts */}
      <div className="mb-5 inline-flex rounded-full border border-border bg-card p-1 shadow-soft">
        {(["companies", "contacts"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
              view === v ? "bg-navy text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v} ({v === "companies" ? companies.length : contacts.length})
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mb-8 space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={view === "companies" ? "Search companies..." : "Search people, companies, emails..."}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
        {view === "companies" && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <SearchableSelect label="Industry" value={industry} onChange={setIndustry} options={["All", ...facets.industries].map((o) => ({ value: o, label: o }))} />
            <SearchableSelect label="Country" value={country} onChange={setCountry} options={["All", ...facets.countries].map((o) => ({ value: o, label: o }))} />
            <SearchableSelect label="Size" value={size} onChange={setSize} options={["All", ...facets.sizes].map((o) => ({ value: o, label: o }))} />
            <SearchableSelect label="Service" value={service} onChange={setService} options={["All", ...facets.services].map((o) => ({ value: o, label: o }))} />
            <SearchableSelect label="Status" value={status} onChange={setStatus} options={["All", ...facets.statuses].map((o) => ({ value: o, label: o }))} />
          </div>
        )}
      </div>

      {/* Contacts view */}
      {view === "contacts" ? (
        contacts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-16 text-center">
            <Users className="mx-auto h-6 w-6 text-muted-foreground" />
            <div className="mt-3 text-lg font-semibold">No contacts for this event yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Import a sheet with contact columns, or add contacts to these companies.
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {filteredContacts.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 12) * 0.02 }}
                className="rounded-3xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                    {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.designation}</div>
                  </div>
                </div>
                {p.companyId ? (
                  <Link
                    to="/companies/$companyId"
                    params={{ companyId: p.companyId }}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-navy hover:underline dark:text-sky"
                  >
                    <Building2 className="h-3 w-3" /> {p.companyName}
                  </Link>
                ) : (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {p.companyName}
                  </div>
                )}
                <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  {p.email !== "—" && <div className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" /> {p.email}</div>}
                  {p.phone !== "—" && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {p.phone}</div>}
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : /* Companies grid */
      filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-16 text-center">
          <div className="text-lg font-semibold">No companies match your filters</div>
          <div className="mt-1 text-sm text-muted-foreground">Try clearing a filter or adjusting your search.</div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {filtered.map((c, idx) => (
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


function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-0.5 truncate font-medium">{v}</div>
    </div>
  );
}
