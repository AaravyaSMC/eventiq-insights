import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Search, Mail, Phone, Building2, Plus, UserRound } from "lucide-react";
import { getContacts, type ContactItem } from "@/lib/data";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/contacts/")({
  loader: async () => ({ contacts: await getContacts() }),
  head: () => ({ meta: [{ title: "Contacts — EventIQ" }] }),
  component: ContactsIndex,
});

type GroupBy = "event" | "company" | "none";

function ContactsIndex() {
  const { contacts } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("event");
  const [limit, setLimit] = useState(150);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.companyName.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.eventName ?? "").toLowerCase().includes(query) ||
        c.designation.toLowerCase().includes(query),
    );
  }, [contacts, q]);

  useEffect(() => setLimit(150), [q, groupBy]);

  const groups = useMemo(() => {
    const visible = filtered.slice(0, limit);
    if (groupBy === "none") return [{ key: "All contacts", items: visible }];
    const map = new Map<string, ContactItem[]>();
    for (const c of visible) {
      const key =
        groupBy === "event" ? c.eventName ?? "No event" : c.companyName || "Unknown company";
      (map.get(key) ?? map.set(key, []).get(key)!).push(c);
    }
    return Array.from(map.entries())
      .sort((a, b) => {
        // Push the "No event" bucket to the end.
        if (a[0] === "No event") return 1;
        if (b[0] === "No event") return -1;
        return a[0].localeCompare(b[0]);
      })
      .map(([key, items]) => ({ key, items }));
  }, [filtered, groupBy, limit]);

  return (
    <PageShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky">Directory</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">All Contacts</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {contacts.length.toLocaleString()} people across every company and event.
          </p>
        </div>
        <Link
          to="/contacts/new"
          className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add Contact
        </Link>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, companies, emails..."
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground">Group by</span>
          {(["event", "company", "none"] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`rounded-full border px-3 py-1.5 font-medium capitalize transition ${
                groupBy === g
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {g === "none" ? "Nothing" : g}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-16 text-center">
          <UserRound className="mx-auto h-6 w-6 text-muted-foreground" />
          <div className="mt-3 text-lg font-semibold">No contacts yet</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Import a spreadsheet or add a contact to get started.
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.key}>
              {groupBy !== "none" && (
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-lg font-semibold tracking-tight">{group.key}</h2>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {group.items.length}
                  </span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {group.items.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.01 }}
                    className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                        {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{c.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.designation}</div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      {c.companyId ? (
                        <Link
                          to="/companies/$companyId"
                          params={{ companyId: c.companyId }}
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                        >
                          <Building2 className="h-3 w-3" /> {c.companyName}
                        </Link>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3 w-3" /> {c.companyName}
                        </div>
                      )}
                      {c.email !== "—" && (
                        <div className="inline-flex items-center gap-1.5">
                          <Mail className="h-3 w-3" /> {c.email}
                        </div>
                      )}
                      {c.phone !== "—" && (
                        <div className="inline-flex items-center gap-1.5">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </div>
                      )}
                    </div>
                    {c.eventName && groupBy !== "event" && (
                      <div className="mt-3 inline-block rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                        {c.eventName}
                        {c.eventYear ? ` · ${c.eventYear}` : ""}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
          {filtered.length > limit && (
            <div className="flex justify-center">
              <button
                onClick={() => setLimit((l) => l + 150)}
                className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium shadow-soft transition hover:bg-secondary"
              >
                Load more ({(filtered.length - limit).toLocaleString()} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
