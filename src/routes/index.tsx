import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, MapPin, Users, Building2, Calendar } from "lucide-react";
import { EVENTS, STATS } from "@/lib/dummy-data";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="mb-14 sm:mb-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-sky" />
            Event Intelligence Platform
          </div>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Every conference,
            <br />
            <span className="text-navy dark:text-sky">one intelligent database.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            A centralized knowledge platform containing every conference, summit and event database
            collected by the organization — searchable, structured, and always current.
          </p>
        </motion.div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Events", value: STATS.totalEvents },
            { label: "Years", value: STATS.totalYears },
            { label: "Companies", value: STATS.totalCompanies.toLocaleString() },
            { label: "Contacts", value: STATS.totalContacts.toLocaleString() },
            { label: "Countries", value: STATS.totalCountries },
            { label: "Industries", value: STATS.totalIndustries },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="rounded-2xl border border-border bg-card px-4 py-3"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-1 text-xl font-semibold">{s.value}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Event Cards */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky">
              Explore
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">All Events</h2>
          </div>
          <div className="text-sm text-muted-foreground">{EVENTS.length} indexed</div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {EVENTS.map((e, idx) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.45 }}
            >
              <Link
                to="/events/$eventId"
                params={{ eventId: e.slug }}
                className="group block overflow-hidden rounded-3xl border border-border bg-card shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-hover"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  <img
                    src={e.cover}
                    alt={e.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute left-4 top-4 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-navy">
                    {e.latestYear}
                  </div>
                  <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-white">
                    <div>
                      <div className="text-lg font-semibold sm:text-2xl">{e.name}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs opacity-90">
                        <MapPin className="h-3 w-3" />
                        {e.location}
                      </div>
                    </div>
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-navy opacity-0 transition group-hover:opacity-100">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-border">
                  <Stat icon={<Building2 className="h-3.5 w-3.5" />} label="Companies" value={e.totalCompanies} />
                  <Stat icon={<Users className="h-3.5 w-3.5" />} label="Contacts" value={e.totalContacts} />
                  <Stat icon={<Calendar className="h-3.5 w-3.5" />} label="Years" value={e.years.length} />
                </div>

                <div className="flex flex-wrap gap-1.5 border-t border-border px-5 py-4">
                  {e.industries.map((i) => (
                    <span
                      key={i}
                      className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}
