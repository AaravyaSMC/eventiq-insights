import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Loader2, RefreshCw, Sparkles, Trash2, Users } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { getEventsList, invalidateData } from "@/lib/data";
import { scanCards, commitCards, type ScannedCard, type CommitSummary } from "@/lib/ai-fns";

export const Route = createFileRoute("/capture")({
  loader: async () => ({ events: await getEventsList() }),
  head: () => ({ meta: [{ title: "Scan Cards — EventIQ" }] }),
  component: CapturePage,
});

const INDEPENDENT = "independent";

/** Downscale + JPEG-compress a photo client-side before upload. */
async function compressImage(file: File, maxEdge = 2000): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function CapturePage() {
  const { events } = Route.useLoaderData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"scan" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [cards, setCards] = useState<ScannedCard[]>([]);
  const [source, setSource] = useState(INDEPENDENT);
  const [summary, setSummary] = useState<CommitSummary | null>(null);

  const editions = events.flatMap((e) =>
    [...e.years].sort((a, b) => b - a).map((year) => ({ value: `${e.slug}:${year}`, label: `${e.name} — ${year}` })),
  );

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setSummary(null);
    setBusy("scan");
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
      const res = await scanCards({ data: { dataUrl } });
      if (!res.cards.length) {
        setError("No business cards detected in that photo. Try again with the cards flat and well-lit.");
        setPreview(null);
      } else {
        setScanId(res.scanId);
        // Append so several photos can be reviewed and saved as one batch.
        setCards((prev) => [...prev, ...res.cards]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
      setPreview(null);
    } finally {
      setBusy(null);
    }
  }

  function setCard(i: number, key: keyof ScannedCard, value: string) {
    setCards((cs) => cs.map((c, idx) => (idx === i ? { ...c, [key]: value || null } : c)));
  }

  async function onSave() {
    setBusy("save");
    setError(null);
    try {
      let eventSlug: string | undefined;
      let eventYear: number | undefined;
      if (source !== INDEPENDENT) {
        const sep = source.lastIndexOf(":");
        eventSlug = source.slice(0, sep);
        eventYear = Number(source.slice(sep + 1));
      }
      const res = await commitCards({ data: { scanId, eventSlug, eventYear, cards } });
      invalidateData();
      setSummary(res);
      setCards([]);
      setPreview(null);
      setScanId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell>
      <Link to="/contacts" className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Contacts
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Scan Business Cards</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Photograph one card — or several laid out in a frame. The AI reads them, you review, pick the
        event, and save. Contacts and companies are created automatically.
      </p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />

      {/* Done state */}
      {summary && (
        <div className="mt-8 max-w-xl rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" /> Saved to the repository
          </div>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>{summary.contactsCreated} contact{summary.contactsCreated === 1 ? "" : "s"} created</li>
            <li>{summary.companiesCreated} compan{summary.companiesCreated === 1 ? "y" : "ies"} created · {summary.companiesMatched} matched existing</li>
            {summary.duplicatesSkipped > 0 && <li>{summary.duplicatesSkipped} duplicate contact{summary.duplicatesSkipped === 1 ? "" : "s"} skipped</li>}
            {summary.warnings.map((w, i) => <li key={i} className="text-amber-600 dark:text-amber-400">{w}</li>)}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => { setSummary(null); fileRef.current?.click(); }} className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-medium text-white">
              <Camera className="h-4 w-4" /> Scan more cards
            </button>
            <Link to="/contacts" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
              <Users className="h-4 w-4" /> View contacts
            </Link>
          </div>
        </div>
      )}

      {/* Capture state */}
      {!summary && cards.length === 0 && (
        <div className="mt-8 max-w-xl">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy === "scan"}
            className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card p-12 text-center shadow-card transition hover:border-sky/60 disabled:opacity-70"
          >
            {busy === "scan" ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-sky" />
                <div className="text-sm font-semibold">Reading cards…</div>
                <div className="text-xs text-muted-foreground">Claude is parsing the photo — this takes a few seconds.</div>
                {preview && <img src={preview} alt="" className="mt-2 max-h-48 rounded-xl opacity-60" />}
              </>
            ) : (
              <>
                <div className="grid h-16 w-16 place-items-center rounded-full bg-navy text-white">
                  <Camera className="h-7 w-7" />
                </div>
                <div className="text-sm font-semibold">Take a photo of the cards</div>
                <div className="text-xs text-muted-foreground">Up to ~8 cards per frame · flat and well-lit works best</div>
              </>
            )}
          </button>
          {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>}
        </div>
      )}

      {/* Review state */}
      {!summary && cards.length > 0 && (
        <div className="mt-8 max-w-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-sky" /> {cards.length} card{cards.length === 1 ? "" : "s"} detected — review before saving
            </div>
            <button onClick={() => { setCards([]); setPreview(null); setError(null); }} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Retake photo
            </button>
          </div>

          {preview && <img src={preview} alt="Scanned cards" className="max-h-56 rounded-2xl border border-border" />}

          <label className="block rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Met at (source)</div>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
              <option value={INDEPENDENT}>Independent — not from an event</option>
              {editions.map((ed) => <option key={ed.value} value={ed.value}>{ed.label}</option>)}
            </select>
          </label>

          {cards.map((card, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-sky">Card {i + 1}</div>
                <button onClick={() => setCards((cs) => cs.filter((_, idx) => idx !== i))} aria-label="Remove card" className="text-muted-foreground hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CardField label="Name" value={card.name} onChange={(v) => setCard(i, "name", v)} />
                <CardField label="Designation" value={card.designation} onChange={(v) => setCard(i, "designation", v)} />
                <CardField label="Company" value={card.company} onChange={(v) => setCard(i, "company", v)} />
                <CardField label="Email" value={card.email} onChange={(v) => setCard(i, "email", v)} />
                <CardField label="Phone" value={card.phone} onChange={(v) => setCard(i, "phone", v)} />
                <CardField label="Website" value={card.website} onChange={(v) => setCard(i, "website", v)} />
                <CardField label="LinkedIn" value={card.linkedin} onChange={(v) => setCard(i, "linkedin", v)} />
                <CardField label="Country" value={card.country} onChange={(v) => setCard(i, "country", v)} />
              </div>
            </div>
          ))}

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>}

          <div className="flex items-center gap-3 pb-6">
            <button onClick={onSave} disabled={busy === "save" || cards.length === 0} className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
              {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />} Save {cards.length} contact{cards.length === 1 ? "" : "s"}
            </button>
            <button onClick={() => fileRef.current?.click()} className="text-sm text-muted-foreground hover:text-foreground">Add another photo first</button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky/40";

function CardField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}
