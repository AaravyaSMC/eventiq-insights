// Deterministic dummy data for EventIQ frontend.
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
  ownership: "Public" | "Private";
  linkedin: string;
  size: "Startup" | "SMB" | "Mid-Market" | "Enterprise";
  status: "Active" | "Prospect" | "Partner" | "Client";
  serviceCategory: string;
  contacts: Contact[];
  eventParticipation: { event: string; year: number }[];
};

export type YearData = {
  year: number;
  companyIds: string[];
  countries: number;
};

export type Event = {
  id: string;
  name: string;
  slug: string;
  location: string;
  cover: string;
  logoColor: string;
  latestYear: number;
  totalCompanies: number;
  totalContacts: number;
  industries: string[];
  description: string;
  website: string;
  years: YearData[];
};

const COUNTRIES = ["UAE", "USA", "UK", "Germany", "India", "Singapore", "KSA", "France", "Australia", "Canada", "Japan", "Netherlands"];
const INDUSTRIES = ["Technology", "AI / ML", "Finance", "Healthcare", "Accounting", "Consulting", "Cybersecurity", "HR Tech", "Blockchain", "Cloud", "SaaS", "Payments"];
const SERVICE_POOL = ["Accounting", "Audit", "Tax", "Payroll", "Healthcare", "RCM", "TPA", "HR", "Finance", "Technology", "AI", "Consulting", "Cloud", "Cybersecurity", "Software", "Outsourcing"];
const SIZES: Company["size"][] = ["Startup", "SMB", "Mid-Market", "Enterprise"];
const EMPLOYEES = ["1-10", "11-50", "51-200", "201-1000", "1001-5000", "5000+"];
const STATUSES: Company["status"][] = ["Active", "Prospect", "Partner", "Client"];

const FIRST = ["Aisha", "James", "Priya", "Marcus", "Elena", "Yusuf", "Sofia", "Daniel", "Amira", "Kenji", "Isabella", "Liam", "Nadia", "Owen", "Zara", "Ravi"];
const LAST = ["Khan", "Anderson", "Sharma", "O'Neil", "Rossi", "Al-Farsi", "Martinez", "Chen", "Habib", "Tanaka", "Silva", "Walker", "Ibrahim", "Novak", "Park", "Iyer"];
const TITLES = ["CEO", "CFO", "Head of Partnerships", "VP Product", "Managing Director", "Director of Sales", "Head of AI", "Chief Strategy Officer", "Global Marketing Lead"];
const DEPTS = ["Executive", "Finance", "Product", "Sales", "Engineering", "Marketing", "Operations"];

// Small seeded PRNG (mulberry32) for deterministic data.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: () => number, arr: T[]) => arr[Math.floor(rng() * arr.length)];
const pickN = <T,>(rng: () => number, arr: T[], n: number) => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
};

const EVENT_SEEDS: Array<Omit<Event, "years" | "totalCompanies" | "totalContacts" | "industries"> & { industries: string[] }> = [
  { id: "dubai-ai", slug: "dubai-ai-summit", name: "Dubai AI Summit", location: "Dubai, UAE", cover: coverUrl("dubai-ai", "1600x900"), logoColor: "#0B2E6D", latestYear: 2025, description: "The premier gathering for AI leaders, researchers, and enterprises shaping the future of intelligence.", website: "dubaiaisummit.example", industries: ["AI / ML", "Technology", "Cloud"] },
  { id: "worfa", slug: "worfa", name: "WORFA", location: "Riyadh, KSA", cover: coverUrl("worfa", "1600x900"), logoColor: "#16B8E8", latestYear: 2025, description: "World Outsourcing & Finance Alliance — connecting global finance and outsourcing leaders.", website: "worfa.example", industries: ["Finance", "Accounting", "Consulting"] },
  { id: "gitex", slug: "gitex-global", name: "GITEX Global", location: "Dubai, UAE", cover: coverUrl("gitex", "1600x900"), logoColor: "#0B2E6D", latestYear: 2025, description: "The world's largest tech event bringing together the entire technology ecosystem.", website: "gitex.example", industries: ["Technology", "Cybersecurity", "Cloud"] },
  { id: "hr-tech", slug: "hr-tech-conference", name: "HR Tech Conference", location: "Las Vegas, USA", cover: coverUrl("hrtech", "1600x900"), logoColor: "#16B8E8", latestYear: 2025, description: "Where HR meets the future — talent, technology, and transformation converge.", website: "hrtechconf.example", industries: ["HR Tech", "SaaS", "Consulting"] },
  { id: "money2020", slug: "money-20-20", name: "Money20/20", location: "Amsterdam, NL", cover: coverUrl("money2020", "1600x900"), logoColor: "#0B2E6D", latestYear: 2024, description: "The world's leading fintech event where money moves forward.", website: "money2020.example", industries: ["Finance", "Payments", "SaaS"] },
  { id: "future-blockchain", slug: "future-blockchain-summit", name: "Future Blockchain Summit", location: "Dubai, UAE", cover: coverUrl("blockchain", "1600x900"), logoColor: "#16B8E8", latestYear: 2025, description: "The largest gathering of Web3 pioneers, protocols, and enterprises.", website: "fbs.example", industries: ["Blockchain", "Technology", "Finance"] },
  { id: "cpa-congress", slug: "cpa-congress", name: "CPA Congress", location: "Sydney, Australia", cover: coverUrl("cpa", "1600x900"), logoColor: "#0B2E6D", latestYear: 2024, description: "The definitive congress for chartered accountants and finance professionals.", website: "cpacongress.example", industries: ["Accounting", "Finance", "Consulting"] },
  { id: "accounting-today", slug: "accounting-today-summit", name: "Accounting Today Summit", location: "New York, USA", cover: coverUrl("acctoday", "1600x900"), logoColor: "#16B8E8", latestYear: 2025, description: "The elite summit for accounting firms defining the profession's next decade.", website: "accountingtoday.example", industries: ["Accounting", "SaaS", "Consulting"] },
];

function coverUrl(seed: string, size: string) {
  // Uses picsum placeholder — deterministic per seed.
  return `https://picsum.photos/seed/${seed}/${size.replace("x", "/")}`;
}

const YEAR_SPAN = 4;
function yearsForEvent(latestYear: number) {
  return Array.from({ length: YEAR_SPAN }, (_, i) => latestYear - (YEAR_SPAN - 1) + i);
}

function buildCompany(rng: () => number, i: number, eventSlug: string, year: number): Company {
  const name = `${pick(rng, COMPANY_PREFIX)} ${pick(rng, COMPANY_SUFFIX)}`;
  const industry = pick(rng, INDUSTRIES);
  const services = pickN(rng, SERVICE_POOL, 3 + Math.floor(rng() * 4));
  const country = pick(rng, COUNTRIES);
  const id = `${eventSlug}-${year}-c${i}`;
  const contactCount = 2 + Math.floor(rng() * 4);
  const contacts: Contact[] = Array.from({ length: contactCount }, (_, k) => ({
    id: `${id}-p${k}`,
    name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
    designation: pick(rng, TITLES),
    department: pick(rng, DEPTS),
    email: "email@company.com",
    phone: "+000 000 0000",
    linkedin: "linkedin.com/in/---",
  }));
  return {
    id,
    name,
    logo: name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    country,
    industry,
    employees: pick(rng, EMPLOYEES),
    website: `${name.toLowerCase().replace(/[^a-z]/g, "")}.example`,
    description: `${name} delivers ${services[0].toLowerCase()} and ${services[1]?.toLowerCase() ?? "consulting"} solutions for ${industry.toLowerCase()} organizations across ${country} and beyond.`,
    primaryService: services[0],
    services,
    founded: 1985 + Math.floor(rng() * 38),
    headquarters: `${country}`,
    revenue: pick(rng, ["$5M–$25M", "$25M–$100M", "$100M–$500M", "$500M+"]),
    targetMarket: pick(rng, ["Enterprise", "Mid-Market", "SMB", "Global"]),
    countriesServed: pickN(rng, COUNTRIES, 3 + Math.floor(rng() * 5)),
    businessModel: pick(rng, ["B2B SaaS", "Services", "Platform", "Consulting"]),
    ownership: rng() > 0.5 ? "Public" : "Private",
    linkedin: "linkedin.com/company/---",
    size: pick(rng, SIZES),
    status: pick(rng, STATUSES),
    serviceCategory: pick(rng, ["Professional Services", "Technology", "Advisory", "Platform"]),
    contacts,
    eventParticipation: [],
  };
}

const COMPANY_PREFIX = ["Nova", "Vertex", "Aurora", "Zenith", "Apex", "Lumen", "Helio", "Orbit", "Meridian", "Cobalt", "Ember", "Kinetic", "Northwind", "Silverline", "Quanta", "Ridge", "Beacon", "Halo", "Ionic", "Cascade"];
const COMPANY_SUFFIX = ["Advisory", "Systems", "Group", "Labs", "Partners", "Technologies", "Analytics", "Global", "Dynamics", "Ventures", "Consulting", "Solutions", "Networks", "Capital"];

export const EVENTS: Event[] = EVENT_SEEDS.map((seed, idx) => {
  const rng = mulberry32(1000 + idx);
  const years: YearData[] = [];
  const companyMap = new Map<string, Company>();
  for (const year of yearsForEvent(seed.latestYear)) {
    const companies = Array.from({ length: 40 }, (_, i) => buildCompany(rng, i, seed.slug, year));
    companies.forEach(c => companyMap.set(c.id, c));
    years.push({
      year,
      companyIds: companies.map(c => c.id),
      countries: new Set(companies.map(c => c.country)).size,
    });
  }
  const allCompanies = Array.from(companyMap.values());
  const totalContacts = allCompanies.reduce((s, c) => s + c.contacts.length, 0);
  return {
    ...seed,
    years,
    totalCompanies: allCompanies.length,
    totalContacts,
    industries: seed.industries,
  };
});

// Flat company index for quick lookup.
export const COMPANY_INDEX = new Map<string, Company>();

// Populate COMPANY_INDEX by regenerating (deterministic).
EVENTS.forEach((ev, idx) => {
  const rng = mulberry32(1000 + idx);
  for (const year of yearsForEvent(ev.latestYear)) {
    for (let i = 0; i < 40; i++) {
      const c = buildCompany(rng, i, ev.slug, year);
      c.eventParticipation = [{ event: ev.name, year }];
      // cross-event participation: alias every 7th company to appear in multiple events
      if (i % 7 === 0) {
        const others = EVENTS.filter(e => e.id !== ev.id).slice(0, 2);
        others.forEach(o => c.eventParticipation.push({ event: o.name, year: o.latestYear }));
      }
      COMPANY_INDEX.set(c.id, c);
    }
  }
});

export function getEvent(idOrSlug: string) {
  return EVENTS.find(e => e.id === idOrSlug || e.slug === idOrSlug);
}
export function getYear(eventIdOrSlug: string, year: number) {
  const ev = getEvent(eventIdOrSlug);
  if (!ev) return null;
  const y = ev.years.find(y => y.year === year);
  return y ? { event: ev, year: y } : null;
}
export function getCompany(id: string) {
  return COMPANY_INDEX.get(id);
}
export function getCompaniesByYear(eventIdOrSlug: string, year: number) {
  const y = getYear(eventIdOrSlug, year);
  if (!y) return [];
  return y.year.companyIds.map(id => COMPANY_INDEX.get(id)!).filter(Boolean);
}
export function getAllCompanies() {
  return Array.from(COMPANY_INDEX.values());
}

export function searchGlobal(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { events: [], companies: [], industries: [], countries: [] };
  const events = EVENTS.filter(e => e.name.toLowerCase().includes(q) || e.location.toLowerCase().includes(q)).slice(0, 5);
  const companies = getAllCompanies().filter(c => c.name.toLowerCase().includes(q)).slice(0, 6);
  const industries = Array.from(new Set(INDUSTRIES.filter(i => i.toLowerCase().includes(q)))).slice(0, 4);
  const countries = Array.from(new Set(COUNTRIES.filter(c => c.toLowerCase().includes(q)))).slice(0, 4);
  return { events, companies, industries, countries };
}

export const STATS = {
  totalEvents: EVENTS.length,
  totalYears: 4,
  totalCompanies: COMPANY_INDEX.size,
  totalContacts: Array.from(COMPANY_INDEX.values()).reduce((s, c) => s + c.contacts.length, 0),
  totalCountries: COUNTRIES.length,
  totalIndustries: INDUSTRIES.length,
};

export { INDUSTRIES, COUNTRIES, SIZES, STATUSES, SERVICE_POOL };
