import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { EVENTS, STATS, getAllCompanies } from "@/lib/dummy-data";
import { PageShell, StatCard } from "@/components/page-shell";
import { LineChart, Line, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — EventIQ" }] }),
});

function Dashboard() {
  const recent = getAllCompanies().slice(0, 6);
  const trend = [
    { m: "Jan", v: 240 }, { m: "Feb", v: 310 }, { m: "Mar", v: 280 }, { m: "Apr", v: 410 },
    { m: "May", v: 380 }, { m: "Jun", v: 520 }, { m: "Jul", v: 610 }, { m: "Aug", v: 580 },
  ];
  const byEvent = EVENTS.map((e) => ({ name: e.name.split(" ")[0], companies: e.totalCompanies }));
  const totalAdded = trend.reduce((s, t) => s + t.v, 0);

  return (
    <PageShell>
      <div className="mb-10">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky">Overview</div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A live snapshot of the intelligence platform across every event, year, and organization.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Events" value={STATS.totalEvents} />
        <StatCard label="Years" value={STATS.totalYears} />
        <StatCard label="Companies" value={STATS.totalCompanies.toLocaleString()} />
        <StatCard label="Contacts" value={STATS.totalContacts.toLocaleString()} />
        <StatCard label="Countries" value={STATS.totalCountries} />
        <StatCard label="Industries" value={STATS.totalIndustries} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Companies added</div>
              <div className="text-2xl font-semibold">{totalAdded.toLocaleString()} this year</div>
            </div>
            <div className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">+18.4%</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="v" stroke="var(--color-sky)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-6 shadow-card">
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
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
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

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2">
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
