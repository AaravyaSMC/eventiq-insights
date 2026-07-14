import { Link, useRouterState } from "@tanstack/react-router";
import { Moon, Sun, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { searchGlobal } from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/", label: "Events" },
  { to: "/companies", label: "Companies" },
  { to: "/analytics", label: "Analytics" },
  { to: "/profile", label: "Profile" },
] as const;

export function TopNav() {
  const { dark, toggle } = useDarkMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchGlobal(query), [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-50 glass-nav border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white shadow-soft">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <div className="text-[15px] font-semibold tracking-tight">Datito7</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">EventIQ</div>
          </div>
        </Link>

        <div ref={ref} className="relative mx-auto w-full max-w-md">
          <div className={cn(
            "flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 transition",
            open && "ring-2 ring-sky/40",
          )}>
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Search events, companies..."
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <AnimatePresence>
            {open && query && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-hover"
              >
                <SearchResults results={results} onSelect={() => { setOpen(false); setQuery(""); }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "relative rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                isActive(n.to) && "text-foreground",
              )}
            >
              {isActive(n.to) && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 -z-10 rounded-full bg-secondary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface transition hover:bg-secondary"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

function SearchResults({
  results,
  onSelect,
}: {
  results: ReturnType<typeof searchGlobal>;
  onSelect: () => void;
}) {
  const empty =
    !results.events.length &&
    !results.companies.length &&
    !results.industries.length &&
    !results.countries.length;
  if (empty) {
    return <div className="p-6 text-center text-sm text-muted-foreground">No results found.</div>;
  }
  return (
    <div className="max-h-[420px] overflow-y-auto p-2">
      {results.events.length > 0 && (
        <Section title="Events">
          {results.events.map((e) => (
            <Link
              key={e.id}
              to="/events/$eventId"
              params={{ eventId: e.slug }}
              onClick={onSelect}
              className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-secondary"
            >
              <div className="h-8 w-8 rounded-lg bg-navy" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{e.name}</div>
                <div className="truncate text-xs text-muted-foreground">{e.location}</div>
              </div>
            </Link>
          ))}
        </Section>
      )}
      {results.companies.length > 0 && (
        <Section title="Companies">
          {results.companies.map((c) => (
            <Link
              key={c.id}
              to="/companies/$companyId"
              params={{ companyId: c.id }}
              onClick={onSelect}
              className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-secondary"
            >
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-[10px] font-semibold">
                {c.logo}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {c.industry} • {c.country}
                </div>
              </div>
            </Link>
          ))}
        </Section>
      )}
      {(results.industries.length > 0 || results.countries.length > 0) && (
        <Section title="Suggestions">
          <div className="flex flex-wrap gap-1.5 px-3 py-2">
            {results.industries.map((i) => (
              <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                {i}
              </span>
            ))}
            {results.countries.map((c) => (
              <span key={c} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                {c}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}
