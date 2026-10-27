import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  Building2,
  Calendar,
  Camera,
  FileUp,
  LayoutDashboard,
  Plus,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Events", icon: Calendar },
  { to: "/companies", label: "Companies", icon: Building2 },
  null, // center slot for the + button
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

type CaptureAction = {
  to: string;
  label: string;
  desc: string;
  icon: typeof Camera;
  accent?: boolean;
};

const ACTIONS: CaptureAction[] = [
  { to: "/capture", label: "Scan business cards", desc: "Photograph cards and add contacts instantly", icon: Camera, accent: true },
  { to: "/companies/new", label: "Add company", desc: "Create a company record manually", icon: Building2 },
  { to: "/contacts/new", label: "Add contact", desc: "Create a contact for a company", icon: UserPlus },
  { to: "/events/new", label: "Create event", desc: "Add an event edition to the repository", icon: Sparkles },
  { to: "/import", label: "Import CSV", desc: "Bulk import an event spreadsheet", icon: FileUp },
];

/** Bottom tab bar + capture sheet, shown only on small screens. */
export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="md:hidden">
      {/* Capture sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-hover"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="text-sm font-semibold">Add to EventIQ</div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {ACTIONS.map((a) => (
                  <Link
                    key={a.to}
                    to={a.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-border p-3.5 transition active:scale-[0.99]",
                      a.accent ? "bg-navy text-white" : "bg-background",
                    )}
                  >
                    <div
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                        a.accent ? "bg-white/15" : "bg-secondary",
                      )}
                    >
                      <a.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{a.label}</div>
                      <div className={cn("truncate text-xs", a.accent ? "text-white/70" : "text-muted-foreground")}>
                        {a.desc}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-center gap-5 border-t border-border pt-3 text-xs font-medium text-muted-foreground">
                <Link to="/analytics" onClick={() => setOpen(false)} className="py-1">Analytics</Link>
                <Link to="/profile" onClick={() => setOpen(false)} className="py-1">Profile</Link>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="py-1">Dashboard</Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {TABS.map((tab, i) =>
            tab ? (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex flex-col items-center gap-1 text-[10px] font-medium transition",
                  isActive(tab.to) ? "text-navy dark:text-sky" : "text-muted-foreground",
                )}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </Link>
            ) : (
              <div key={i} className="flex justify-center">
                <button
                  onClick={() => setOpen(true)}
                  aria-label="Add"
                  className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-navy text-white shadow-hover transition active:scale-95"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
