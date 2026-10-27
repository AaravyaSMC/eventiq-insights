import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, MapPin, Users, Building2, Plus } from "lucide-react";
import { getEvents, getStats } from "@/lib/data";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [events, stats] = await Promise.all([getEvents(), getStats()]);
    return { events, stats };
  },
  component: HomePage,
});

function HomePage() {
  const { events: EVENTS, stats: STATS } = Route.useLoaderData();

  return (
    <PageShell>
      {/* Hero */}
      <section className="mb-10 sm:mb-20">
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

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 lg:grid-cols-6">
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
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">{EVENTS.length} indexed</div>
            <Link
              to="/events/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Create event
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-6">
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
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-hover md:rounded-3xl"
              >
                {/* Phone: compact tile (photo only if one exists — no decorative gradient) */}
                <div className="flex flex-1 flex-col md:hidden">
                  {e.coverUrl && (
                    <img src={e.coverUrl} alt="" loading="lazy" className="aspect-[2/1] w-full object-cover" />
                  )}
                  <div className="flex flex-1 flex-col p-3">
                    <div className="flex items-center justify-between gap-2">
                      {!e.coverUrl && (
                        <div
                          className="h-6 w-6 shrink-0 rounded-md"
                          style={{ background: `linear-gradient(135deg, ${e.logoColor} 0%, #0B2E6D 100%)` }}
                        />
                      )}
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                        {e.years.length > 1 ? `${e.years.length} editions` : e.latestYear}
                      </span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{e.name}</div>
                    <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{e.location}</span>
                    </div>
                    <div className="mt-auto flex items-center gap-3 pt-2.5 text-[11px] font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {e.totalCompanies}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {e.totalContacts}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop: hero card */}
                <div className="hidden md:block">
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    {e.coverUrl ? (
                      <img
                        src={e.coverUrl}
                        alt={e.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="h-full w-full transition duration-700 group-hover:scale-105"
                        style={{ background: `linear-gradient(135deg, ${e.logoColor} 0%, #0B2E6D 100%)` }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute left-4 top-4 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-navy">
                      {e.latestYear}
                    </div>
                    <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-white">
                      <div>
                        <div className="text-2xl font-semibold">{e.name}</div>
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
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <Stat icon={<Building2 className="h-3.5 w-3.5" />} label="Companies" value={e.totalCompanies} />
                    <Stat icon={<Users className="h-3.5 w-3.5" />} label="Contacts" value={e.totalContacts} />
                  </div>
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
