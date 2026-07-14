import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getAllCompanies, INDUSTRIES, COUNTRIES } from "@/lib/dummy-data";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/companies/")({
  component: CompaniesIndex,
  head: () => ({ meta: [{ title: "Companies — EventIQ" }] }),
});

function CompaniesIndex() {
  const all = useMemo(() => getAllCompanies(), []);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("All");
  const [country, setCountry] = useState("All");
  const [page, setPage] = useState(1);
  const perPage = 30;

  const filtered = useMemo(() => {
    return all.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (industry !== "All" && c.industry !== industry) return false;
      if (country !== "All" && c.country !== country) return false;
      return true;
    });
  }, [all, q, industry, country]);

  const paged = filtered.slice(0, page * perPage);

  return (
    <PageShell>
      <div className="mb-8">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky">Directory</div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">All Companies</h1>
        <p className="mt-2 text-sm text-muted-foreground">{all.length.toLocaleString()} companies indexed across all events.</p>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies..." className="w-full bg-transparent text-sm focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Filter label="Industry" value={industry} onChange={setIndustry} options={["All", ...INDUSTRIES]} />
          <Filter label="Country" value={country} onChange={setCountry} options={["All", ...COUNTRIES]} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paged.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 20) * 0.01 }}
          >
            <Link
              to="/companies/$companyId"
              params={{ companyId: c.id }}
              className="block rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-hover"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-xs font-semibold text-navy dark:text-sky">{c.logo}</div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.industry} · {c.country}</div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {paged.length < filtered.length && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium shadow-soft transition hover:bg-secondary"
          >
            Load more ({filtered.length - paged.length} remaining)
          </button>
        </div>
      )}
    </PageShell>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-soft">
      <span className="font-medium text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent font-medium focus:outline-none">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
