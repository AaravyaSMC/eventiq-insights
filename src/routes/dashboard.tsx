import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { getEvents, getStats, getAllCompanies } from "@/lib/data";
import { PageShell, StatCard } from "@/components/page-shell";
import { LineChart, Line, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const [events, stats, companies] = await Promise.all([getEvents(), getStats(), getAllCompanies()]);
    // Real "companies by year": distinct companies participating in each year across all events.
    const yearMap = new Map<number, Set<string>>();
    events.forEach((e) =>
      e.years.forEach((y) => {
        const set = yearMap.get(y.year) ?? new Set<string>();
        y.companyIds.forEach((id) => set.add(id));
        yearMap.set(y.year, set);
      }),
    );
    const byYear = Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, set]) => ({ year: String(year), companies: set.size }));
    return { events, stats, recent: companies.slice(0, 6), byYear };
  },
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — EventIQ" }] }),
});

function Dashboard() {
  const { events: EVENTS, stats: STATS, recent, byYear } = Route.useLoaderData();
  const byEvent = EVENTS.map((e) => ({ name: e.name.split(" ")[0], companies: e.totalCompanies }));

  return (
    <PageShell>
      <div className="mb-6 sm:mb-10">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky">Overview</div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A live snapshot of the intelligence platform across every event, year, and organization.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        <StatCard label="Total Events" value={STATS.totalEvents} />
        <StatCard label="Years" value={STATS.totalYears} />
        <StatCard label="Companies" value={STATS.totalCompanies.toLocaleString()} />
        <StatCard label="Contacts" value={STATS.totalContacts.toLocaleString()} />
        <StatCard label="Countries" value={STATS.totalCountries} />
        <StatCard label="Industries" value={STATS.totalIndustries} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Companies by year</div>
              <div className="text-2xl font-semibold">{STATS.totalCompanies.toLocaleString()} total</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byYear}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="companies" stroke="var(--color-sky)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Companies per event</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byEvent}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Bar dataKey="companies" fill="var(--color-navy)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Popular events + recent */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Popular Events</div>
          <div className="space-y-3">
            {EVENTS.slice(0, 5).map((e) => (
              <Link key={e.id} to="/events/$eventId" params={{ eventId: e.slug }} className="flex items-center justify-between rounded-xl px-3 py-2 -mx-3 hover:bg-secondary">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.location}</div>
                </div>
                <div className="text-xs font-medium text-muted-foreground">{e.totalCompanies}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recently Viewed</div>
            <Link to="/companies" className="text-xs font-medium text-sky hover:underline">View all</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((c) => (
              <Link key={c.id} to="/companies/$companyId" params={{ companyId: c.id }} className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-secondary">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-xs font-semibold">{c.logo}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.industry} · {c.country}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
