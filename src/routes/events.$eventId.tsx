import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, Globe, MapPin } from "lucide-react";
import { getEvent } from "@/lib/dummy-data";
import { PageShell, StatCard } from "@/components/page-shell";

export const Route = createFileRoute("/events/$eventId")({
  loader: ({ params }) => {
    const ev = getEvent(params.eventId);
    if (!ev) throw notFound();
    return { event: ev };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.event.name} — EventIQ` },
          { name: "description", content: loaderData.event.description },
        ]
      : [{ title: "Event — EventIQ" }],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { event } = Route.useLoaderData();

  return (
    <PageShell>
      {/* Breadcrumb */}
      <div className="mb-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Events</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{event.name}</span>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-3xl border border-border bg-card shadow-card"
      >
        <div className="relative aspect-[21/9] overflow-hidden bg-muted">
          <img src={event.cover} alt={event.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-x-6 bottom-6 flex items-end justify-between text-white sm:inset-x-10 sm:bottom-10">
            <div className="flex items-center gap-4">
              <div
                className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-semibold text-white shadow-hover"
                style={{ background: event.logoColor }}
              >
                {event.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
              </div>
              <div>
                <h1 className="text-2xl font-semibold sm:text-4xl">{event.name}</h1>
                <div className="mt-1 flex items-center gap-3 text-sm opacity-90">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>
                  <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {event.website}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <p className="max-w-3xl text-base text-muted-foreground">{event.description}</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Years Available" value={event.years.length} />
        <StatCard label="Companies" value={event.totalCompanies.toLocaleString()} />
        <StatCard label="Contacts" value={event.totalContacts.toLocaleString()} />
        <StatCard label="Industries" value={event.industries.length} />
        <StatCard
          label="Countries"
          value={new Set(event.years.flatMap((y) => y.countries)).size || 12}
        />
      </div>

      {/* Years */}
      <section className="mt-14">
        <div className="mb-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky">Databases</div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Available Years</h2>
          <p className="mt-2 text-sm text-muted-foreground">Open a year to browse the participating companies.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {event.years.map((y, idx) => (
            <motion.div
              key={y.year}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link
                to="/events/$eventId/$year"
                params={{ eventId: event.slug, year: String(y.year) }}
                className="group block rounded-3xl border border-border bg-card p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-hover"
              >
                <div className="flex items-start justify-between">
                  <div className="text-4xl font-semibold tracking-tight">{y.year}</div>
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground transition group-hover:bg-navy group-hover:text-white">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-6 space-y-2 text-sm">
                  <Row label="Companies" value={y.companyIds.length} />
                  <Row label="Contacts" value={y.companyIds.length * 4} />
                  <Row label="Countries" value={y.countries} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-2 text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value.toLocaleString()}</span>
    </div>
  );
}
