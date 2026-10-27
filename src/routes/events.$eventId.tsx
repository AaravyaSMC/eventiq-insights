import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { ArrowUpRight, Globe, MapPin, ImagePlus } from "lucide-react";
import { getEvent, getCompaniesByYear, getContactsByYear, invalidateData } from "@/lib/data";
import { setEventCover } from "@/lib/server-fns";
import { CoverCropper } from "@/components/cover-cropper";
import { PageShell, StatCard } from "@/components/page-shell";

export const Route = createFileRoute("/events/$eventId")({
  loader: async ({ params }) => {
    const ev = await getEvent(params.eventId);
    if (!ev) throw notFound();
    const perYear = await Promise.all(
      ev.years.map((y) => getCompaniesByYear(params.eventId, y.year)),
    );
    const countries = new Set(perYear.flat().map((c) => c.country)).size;
    const contactsPerYear = await Promise.all(
      ev.years.map((y) => getContactsByYear(params.eventId, y.year)),
    );
    const contactsByYear: Record<number, number> = {};
    ev.years.forEach((y, i) => {
      contactsByYear[y.year] = contactsPerYear[i].length;
    });
    return { event: ev, countries, contactsByYear };
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
  const { event, countries, contactsByYear } = Route.useLoaderData();
  const router = useRouter();
  const [cropOpen, setCropOpen] = useState(false);

  async function saveCover(dataUrl: string) {
    await setEventCover({ data: { slug: event.slug, dataUrl } });
    setCropOpen(false);
    invalidateData();
    await router.invalidate();
  }

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
        {/* Phone, no cover photo: compact header instead of a decorative gradient block */}
        {!event.coverUrl && (
          <div className="flex items-start gap-3 p-4 md:hidden">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-base font-semibold text-white"
              style={{ background: event.logoColor }}
            >
              {event.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold leading-tight">{event.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>
                <span className="inline-flex max-w-full items-center gap-1"><Globe className="h-3 w-3 shrink-0" /> <span className="truncate">{event.website}</span></span>
              </div>
            </div>
            <button
              onClick={() => setCropOpen(true)}
              aria-label="Add cover"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className={`relative overflow-hidden bg-muted ${event.coverUrl ? "aspect-[16/9] md:aspect-[21/9]" : "hidden aspect-[21/9] md:block"}`}>
          {event.coverUrl ? (
            <img src={event.coverUrl} alt={event.name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `linear-gradient(135deg, ${event.logoColor} 0%, #0B2E6D 100%)` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <button
            onClick={() => setCropOpen(true)}
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/60"
          >
            <ImagePlus className="h-3.5 w-3.5" /> {event.coverUrl ? "Change cover" : "Add cover"}
          </button>
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-white sm:inset-x-10 sm:bottom-10">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className="hidden h-16 w-16 place-items-center rounded-2xl text-2xl font-semibold text-white shadow-hover sm:grid"
                style={{ background: event.logoColor }}
              >
                {event.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("")}
              </div>
              <div>
                <h1 className="text-xl font-semibold sm:text-4xl">{event.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs opacity-90 sm:text-sm">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>
                  <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {event.website}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border p-4 sm:p-8 md:border-t-0">
          <p className="max-w-3xl text-justify text-sm text-muted-foreground sm:text-base">{event.description}</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Years Available" value={event.years.length} />
        <StatCard label="Companies" value={event.totalCompanies.toLocaleString()} />
        <StatCard label="Contacts" value={event.totalContacts.toLocaleString()} />
        <StatCard label="Industries" value={event.industries.length} />
        <StatCard label="Countries" value={countries} />
      </div>

      {/* Years */}
      <section className="mt-10 sm:mt-14">
        <div className="mb-5 sm:mb-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky">Databases</div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Available Years</h2>
          <p className="mt-2 text-sm text-muted-foreground">Open a year to browse the participating companies.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
                className="group block rounded-2xl border border-border bg-card p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-hover sm:rounded-3xl sm:p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="text-2xl font-semibold tracking-tight sm:text-4xl">{y.year}</div>
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground transition group-hover:bg-navy group-hover:text-white sm:h-9 sm:w-9">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-xs sm:mt-6 sm:text-sm">
                  <Row label="Companies" value={y.companyIds.length} />
                  <Row label="Contacts" value={contactsByYear[y.year] ?? 0} />
                  <Row label="Countries" value={y.countries} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <CoverCropper
        open={cropOpen}
        title={`Cover — ${event.name}`}
        onClose={() => setCropOpen(false)}
        onSave={saveCover}
      />
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
