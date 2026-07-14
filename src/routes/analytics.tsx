import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { EVENTS, INDUSTRIES, COUNTRIES, getAllCompanies } from "@/lib/dummy-data";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/analytics")({
  component: Analytics,
  head: () => ({ meta: [{ title: "Analytics — EventIQ" }] }),
});

function Analytics() {
  const companies = getAllCompanies();
  const industryData = INDUSTRIES.map((i) => ({
    name: i,
    value: companies.filter((c) => c.industry === i).length,
  }));
  const countryData = COUNTRIES.map((c) => ({
    name: c,
    value: companies.filter((x) => x.country === c).length,
  }));
  const eventData = EVENTS.map((e) => ({ name: e.name.split(" ")[0], contacts: e.totalContacts }));

  const COLORS = ["#0B2E6D", "#16B8E8", "#3A5DA9", "#78D6EF", "#0B2E6D80", "#16B8E880"];

  return (
    <PageShell>
      <div className="mb-10">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky">Insights</div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">Distributions across industries, geographies, and events.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Industry Distribution</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={industryData} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {industryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contacts per Event</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventData}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Bar dataKey="contacts" fill="var(--color-sky)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Companies by Country</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryData}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Bar dataKey="value" fill="var(--color-navy)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}
