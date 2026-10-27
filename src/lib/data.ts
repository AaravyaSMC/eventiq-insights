// Supabase-backed data layer for EventIQ.
//
// This replaces the old deterministic `dummy-data.ts`. It loads the small
// dataset (events, companies, participation) once, builds in-memory indexes,
// and exposes the SAME shapes the UI already renders — so the route components
// barely change. The DB doesn't store some presentational fields (cover images,
// logo colors, per-event industry tags, contacts), so those are derived here.
//
// Data model in Supabase:
//   events ──< event_years ──< company_event_participation >── companies
import { supabase } from "./supabase";

// ----- Public types (mirror the original dummy-data shapes) -----
export type Contact = {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  linkedin: string;
};

export type Company = {
  id: string;
  name: string;
  logo: string;
  country: string;
  industry: string;
  employees: string;
  website: string;
  description: string;
  primaryService: string;
  services: string[];
  founded: number;
  headquarters: string;
  revenue: string;
  targetMarket: string;
  countriesServed: string[];
  businessModel: string;
  ownership: string;
  linkedin: string;
  size: string;
  status: string;
  serviceCategory: string;
  contacts: Contact[];
  eventParticipation: { event: string; slug: string; year: number }[];
};

// A contact with the company/event context needed for the CRM contacts list.
export type ContactItem = Contact & {
  companyId: string;
  companyName: string;
  eventName: string | null; // event where this contact was met (if known)
  eventSlug: string | null;
  eventYear: number | null;
};

export type YearData = {
  year: number;
  companyIds: string[];
  countries: number;
};

export type EventItem = {
  id: string;
  name: string;
  slug: string;
  location: string;
  coverUrl: string | null;
  logoColor: string;
  latestYear: number;
  totalCompanies: number;
  totalContacts: number;
  industries: string[];
  description: string;
  website: string;
  years: YearData[];
};

export type Facets = {
  industries: string[];
  countries: string[];
  sizes: string[];
  statuses: string[];
  serviceCategories: string[];
};

// ----- Derivation helpers for fields the DB doesn't store -----
const LOGO_COLORS = [
  "#0B2E6D", "#16B8E8", "#3A5DA9", "#0EA5E9",
  "#1E3A8A", "#0369A1", "#2563EB", "#0891B2",
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function logoColor(seed: string): string {
  return LOGO_COLORS[hashString(seed) % LOGO_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

function sizeFromEmployees(range: string | null, count: number | null): string {
  const n = count ?? (range ? parseInt(range.replace(/[^\d]/g, ""), 10) : NaN);
  if (!Number.isNaN(n)) {
    if (n <= 10) return "Startup";
    if (n <= 200) return "SMB";
    if (n <= 1000) return "Mid-Market";
    return "Enterprise";
  }
  return "SMB";
}

function normalizeOwnership(value: string | null): string {
  if (value && /public/i.test(value)) return "Public";
  if (value && /private/i.test(value)) return "Private";
  return value || "Private";
}

// ----- Raw row shapes from Supabase -----
type CompanyRow = {
  id: string;
  name: string;
  country: string | null;
  industry: string | null;
  website: string | null;
  linkedin: string | null;
  description: string | null;
  primary_service: string | null;
  services: unknown;
  service_tags: unknown;
  founded_year: number | null;
  headquarters: string | null;
  employees_range: string | null;
  employee_count: number | null;
  revenue_range: string | null;
  revenue: string | null;
  target_market: string | null;
  countries_served: unknown;
  business_model: string | null;
  business_type: string | null;
  ownership: string | null;
  status: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  website: string | null;
  description: string | null;
  cover_url: string | null;
  event_years: Array<{
    id: string;
    year: number;
    company_event_participation: Array<{ company_id: string }>;
  }>;
};

type ContactRow = {
  id: string;
  company_id: string | null;
  event_year_id: string | null;
  name: string | null;
  designation: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
};

const DASH = "—";

function mapCompany(row: CompanyRow): Company {
  const services = (() => {
    const s = asArray(row.services);
    return s.length ? s : asArray(row.service_tags);
  })();
  const industry = row.industry ?? asArray(row.service_tags)[0] ?? "Uncategorized";
  const country = row.country ?? DASH;
  return {
    id: row.id,
    name: row.name,
    logo: initials(row.name),
    country,
    industry,
    employees: row.employees_range ?? (row.employee_count != null ? String(row.employee_count) : DASH),
    website: row.website ?? DASH,
    description:
      row.description ??
      `${row.name} — ${industry}${country !== DASH ? `, ${country}` : ""}.`,
    primaryService: row.primary_service ?? services[0] ?? DASH,
    services,
    founded: row.founded_year ?? 0,
    headquarters: row.headquarters ?? (country !== DASH ? country : DASH),
    revenue: row.revenue_range ?? row.revenue ?? DASH,
    targetMarket: row.target_market ?? DASH,
    countriesServed: asArray(row.countries_served),
    businessModel: row.business_model ?? row.business_type ?? DASH,
    ownership: normalizeOwnership(row.ownership),
    linkedin: row.linkedin ?? DASH,
    size: sizeFromEmployees(row.employees_range, row.employee_count),
    status: row.status ?? "Prospect",
    serviceCategory: row.business_type ?? "Professional Services",
    contacts: [], // contacts table is currently empty
    eventParticipation: [], // filled in during index build
  };
}

// ----- In-memory store, loaded once and cached -----
type Store = {
  events: EventItem[];
  companyIndex: Map<string, Company>;
  companiesByYear: Map<string, string[]>; // key: `${slug}:${year}`
  contacts: ContactItem[];
  stats: {
    totalEvents: number;
    totalYears: number;
    totalCompanies: number;
    totalContacts: number;
    totalCountries: number;
    totalIndustries: number;
  };
  facets: Facets;
};

let storePromise: Store | null = null;
let inflight: Promise<Store> | null = null;

const COMPANY_SELECT =
  "id,name,country,industry,website,linkedin,description,primary_service,services,service_tags,founded_year,headquarters,employees_range,employee_count,revenue_range,revenue,target_market,countries_served,business_model,business_type,ownership,status";

const EVENT_SELECT =
  "id,slug,name,location,website,description,cover_url,event_years(id,year,company_event_participation(company_id))";

const CONTACT_SELECT =
  "id,company_id,event_year_id,name,designation,department,email,phone,linkedin";

async function buildStore(): Promise<Store> {
  const [companiesRes, eventsRes, contactsRes] = await Promise.all([
    supabase.from("companies").select(COMPANY_SELECT).limit(20000),
    supabase.from("events").select(EVENT_SELECT).order("name"),
    supabase.from("contacts").select(CONTACT_SELECT).limit(50000),
  ]);

  if (companiesRes.error) throw companiesRes.error;
  if (eventsRes.error) throw eventsRes.error;
  if (contactsRes.error) throw contactsRes.error;

  const companyIndex = new Map<string, Company>();
  for (const row of (companiesRes.data ?? []) as CompanyRow[]) {
    companyIndex.set(row.id, mapCompany(row));
  }

  const companiesByYear = new Map<string, string[]>();
  const events: EventItem[] = [];
  // event_year_id -> event context, used to place contacts and count contacts per event.
  const eventYearIndex = new Map<string, { eventName: string; eventSlug: string; year: number }>();

  for (const ev of (eventsRes.data ?? []) as EventRow[]) {
    const years: YearData[] = [];
    const eventCompanyIds = new Set<string>();
    const eventIndustries = new Set<string>();

    const sortedYears = [...(ev.event_years ?? [])].sort((a, b) => a.year - b.year);
    for (const ey of sortedYears) {
      eventYearIndex.set(ey.id, { eventName: ev.name, eventSlug: ev.slug, year: ey.year });
      const idsThisYear: string[] = [];
      const seen = new Set<string>();
      const countrySet = new Set<string>();
      for (const p of ey.company_event_participation ?? []) {
        if (!p.company_id || seen.has(p.company_id)) continue;
        seen.add(p.company_id);
        idsThisYear.push(p.company_id);
        eventCompanyIds.add(p.company_id);
        const company = companyIndex.get(p.company_id);
        if (company) {
          if (company.country !== DASH) countrySet.add(company.country);
          if (company.industry) eventIndustries.add(company.industry);
          company.eventParticipation.push({ event: ev.name, slug: ev.slug, year: ey.year });
        }
      }
      companiesByYear.set(`${ev.slug}:${ey.year}`, idsThisYear);
      years.push({ year: ey.year, companyIds: idsThisYear, countries: countrySet.size });
    }

    const latestYear = years.length ? Math.max(...years.map((y) => y.year)) : 0;
    events.push({
      id: ev.id,
      slug: ev.slug,
      name: ev.name,
      location: ev.location ?? DASH,
      website: ev.website ?? DASH,
      description: ev.description ?? `${ev.name} — participating companies and intelligence.`,
      coverUrl: ev.cover_url ?? null,
      logoColor: logoColor(ev.slug),
      latestYear,
      totalCompanies: eventCompanyIds.size,
      totalContacts: 0, // set below once contacts are placed
      industries: Array.from(eventIndustries).slice(0, 6),
      years,
    });
  }

  // Attach contacts to their company and build the global contacts list.
  const contacts: ContactItem[] = [];
  const contactsPerEventSlug = new Map<string, number>();
  for (const row of (contactsRes.data ?? []) as ContactRow[]) {
    const company = row.company_id ? companyIndex.get(row.company_id) : undefined;
    // Event context: prefer the contact's own event_year, else the company's first event.
    const ctx = row.event_year_id ? eventYearIndex.get(row.event_year_id) : undefined;
    const fallback = company?.eventParticipation[0];
    const eventName = ctx?.eventName ?? fallback?.event ?? null;
    const eventSlug = ctx?.eventSlug ?? fallback?.slug ?? null;
    const eventYear = ctx?.year ?? fallback?.year ?? null;

    const contact: Contact = {
      id: row.id,
      name: row.name ?? "Unnamed contact",
      designation: row.designation ?? DASH,
      department: row.department ?? DASH,
      email: row.email ?? DASH,
      phone: row.phone ?? DASH,
      linkedin: row.linkedin ?? DASH,
    };
    if (company) company.contacts.push(contact);
    contacts.push({
      ...contact,
      companyId: row.company_id ?? "",
      companyName: company?.name ?? "Unknown company",
      eventName,
      eventSlug,
      eventYear,
    });
    if (eventSlug) contactsPerEventSlug.set(eventSlug, (contactsPerEventSlug.get(eventSlug) ?? 0) + 1);
  }
  // Fill per-event contact totals now that contacts are placed.
  for (const ev of events) ev.totalContacts = contactsPerEventSlug.get(ev.slug) ?? 0;

  // Global facets + stats derived from real data.
  const allCompanies = Array.from(companyIndex.values());
  const industries = uniqueSorted(allCompanies.map((c) => c.industry));
  const countries = uniqueSorted(allCompanies.map((c) => c.country).filter((c) => c !== DASH));
  const sizes = uniqueSorted(allCompanies.map((c) => c.size));
  const statuses = uniqueSorted(allCompanies.map((c) => c.status));
  const serviceCategories = uniqueSorted(allCompanies.map((c) => c.serviceCategory));
  const allYears = new Set<number>();
  events.forEach((e) => e.years.forEach((y) => allYears.add(y.year)));

  return {
    events,
    companyIndex,
    companiesByYear,
    contacts,
    stats: {
      totalEvents: events.length,
      totalYears: allYears.size,
      totalCompanies: companyIndex.size,
      totalContacts: contacts.length,
      totalCountries: countries.length,
      totalIndustries: industries.length,
    },
    facets: { industries, countries, sizes, statuses, serviceCategories },
  };
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

/** Clear the cached store so the next read re-fetches from Supabase (call after a write). */
export function invalidateData(): void {
  storePromise = null;
  inflight = null;
}

async function getStore(): Promise<Store> {
  if (storePromise) return storePromise;
  if (!inflight) {
    inflight = buildStore().then((s) => {
      storePromise = s;
      inflight = null;
      return s;
    }).catch((err) => {
      inflight = null;
      throw err;
    });
  }
  return inflight;
}

// ----- Public API (async) — mirrors the old dummy-data functions -----
export async function getEvents(): Promise<EventItem[]> {
  return (await getStore()).events;
}

export async function getStats() {
  return (await getStore()).stats;
}

export async function getFacets(): Promise<Facets> {
  return (await getStore()).facets;
}

export async function getEvent(idOrSlug: string): Promise<EventItem | undefined> {
  const { events } = await getStore();
  return events.find((e) => e.id === idOrSlug || e.slug === idOrSlug);
}

export async function getCompany(id: string): Promise<Company | undefined> {
  return (await getStore()).companyIndex.get(id);
}

export async function getAllCompanies(): Promise<Company[]> {
  return Array.from((await getStore()).companyIndex.values());
}

/** All contacts with company + event context, for the CRM contacts list. */
export async function getContacts(): Promise<ContactItem[]> {
  return (await getStore()).contacts;
}

/** Lightweight event list for dropdowns: slug, name, latest year, all years. */
export async function getEventsList(): Promise<
  { slug: string; name: string; latestYear: number; years: number[] }[]
> {
  const { events } = await getStore();
  return events.map((e) => ({
    slug: e.slug,
    name: e.name,
    latestYear: e.latestYear,
    years: e.years.map((y) => y.year),
  }));
}

export async function getCompaniesByYear(idOrSlug: string, year: number): Promise<Company[]> {
  const store = await getStore();
  const ev = store.events.find((e) => e.id === idOrSlug || e.slug === idOrSlug);
  if (!ev) return [];
  const ids = store.companiesByYear.get(`${ev.slug}:${year}`) ?? [];
  return ids.map((id) => store.companyIndex.get(id)).filter((c): c is Company => Boolean(c));
}

// ----- Per-company CRM data (fetched fresh, not part of the cached store) -----
export type CompanyNote = {
  id: string;
  body: string;
  createdAt: string;
};

export type CompanyAttachment = {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

export async function getCompanyNotes(companyId: string): Promise<CompanyNote[]> {
  const res = await supabase
    .from("company_notes")
    .select("id,body,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (res.error) throw res.error;
  return (res.data ?? []).map((n) => ({ id: n.id, body: n.body, createdAt: n.created_at }));
}

export async function getCompanyAttachments(companyId: string): Promise<CompanyAttachment[]> {
  const res = await supabase
    .from("company_attachments")
    .select("id,file_name,mime_type,size_bytes,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (res.error) throw res.error;
  return (res.data ?? []).map((a) => ({
    id: a.id,
    fileName: a.file_name,
    mimeType: a.mime_type,
    sizeBytes: a.size_bytes,
    createdAt: a.created_at,
  }));
}

/** Contacts met at a specific edition (event + year) of an event. */
export async function getContactsByYear(idOrSlug: string, year: number): Promise<ContactItem[]> {
  const store = await getStore();
  const ev = store.events.find((e) => e.id === idOrSlug || e.slug === idOrSlug);
  if (!ev) return [];
  return store.contacts.filter((c) => c.eventSlug === ev.slug && c.eventYear === year);
}

export async function searchGlobal(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { events: [], companies: [], industries: [], countries: [] };
  const store = await getStore();
  const events = store.events
    .filter((e) => e.name.toLowerCase().includes(q) || e.location.toLowerCase().includes(q))
    .slice(0, 5);
  const companies = Array.from(store.companyIndex.values())
    .filter((c) => c.name.toLowerCase().includes(q))
    .slice(0, 6);
  const industries = store.facets.industries.filter((i) => i.toLowerCase().includes(q)).slice(0, 4);
  const countries = store.facets.countries.filter((c) => c.toLowerCase().includes(q)).slice(0, 4);
  return { events, companies, industries, countries };
}
