import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Upload, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { IMPORT_COLUMNS, downloadTemplate, parseCsv } from "@/lib/csv";
import { importRows, type ImportSummary } from "@/lib/server-fns";
import { invalidateData } from "@/lib/data";

export const Route = createFileRoute("/import")({
  head: () => ({ meta: [{ title: "Import — EventIQ" }] }),
  component: ImportPage,
});

function ImportPage() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [committed, setCommitted] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState<"none" | "preview" | "commit">("none");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPreview(null);
    setCommitted(null);
    setError(null);
  };

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    setHeaders(headers);
    setRows(rows);
    if (!rows.length) {
      setError("No data rows found in that file. Did you fill in the template?");
      return;
    }
    setBusy("preview");
    try {
      const summary = await importRows({ data: { fileName: file.name, commit: false, rows } });
      setPreview(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze file.");
    } finally {
      setBusy("none");
    }
  }

  async function onCommit() {
    if (!rows.length) return;
    setBusy("commit");
    setError(null);
    try {
      const summary = await importRows({ data: { fileName, commit: true, rows } });
      setCommitted(summary);
      invalidateData();
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy("none");
    }
  }

  return (
    <PageShell>
      <div className="mb-8">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky">Data</div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Import</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Download the template, paste your data into it (Excel opens CSV directly), then upload.
          Companies, events, and contacts are matched and de-duplicated automatically — you preview
          before anything is written.
        </p>
      </div>

      {/* Step 1 — template */}
      <Step n={1} title="Download the template">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Download CSV template
          </button>
          <div className="text-xs text-muted-foreground">Columns: {IMPORT_COLUMNS.join(", ")}</div>
        </div>
      </Step>

      {/* Step 2 — upload */}
      <Step n={2} title="Upload your filled-in file">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center transition hover:bg-secondary/40">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <div className="text-sm font-medium">{fileName || "Choose a .csv file"}</div>
          <div className="text-xs text-muted-foreground">Save your sheet as CSV before uploading.</div>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        </label>
        {rows.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {rows.length.toLocaleString()} rows · {headers.length} columns detected
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-secondary/60">
                  <tr>{headers.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {headers.map((h) => <td key={h} className="whitespace-nowrap px-3 py-2 text-muted-foreground">{r[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && <div className="mt-1 text-[11px] text-muted-foreground">Showing first 5 of {rows.length} rows.</div>}
          </div>
        )}
      </Step>

      {/* Step 3 — preview + commit */}
      {(busy === "preview" || preview || committed) && (
        <Step n={3} title="Review & confirm">
          {busy === "preview" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </div>
          )}

          {preview && !committed && (
            <>
              <SummaryGrid s={preview} />
              {preview.warnings.length > 0 && <Warnings warnings={preview.warnings} />}
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={onCommit}
                  disabled={busy === "commit"}
                  className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {busy === "commit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Commit import
                </button>
                <span className="text-xs text-muted-foreground">Nothing has been written yet — this is a preview.</span>
              </div>
            </>
          )}

          {committed && (
            <>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" /> Import complete
              </div>
              <SummaryGrid s={committed} />
              {committed.warnings.length > 0 && <Warnings warnings={committed.warnings} />}
            </>
          )}
        </Step>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
    </PageShell>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-7">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{n}</div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SummaryGrid({ s }: { s: ImportSummary }) {
  const items = [
    { label: "Rows processed", value: s.rowsProcessed },
    { label: "Companies — new", value: s.companiesCreated },
    { label: "Companies — matched", value: s.companiesMatched },
    { label: "Events — new", value: s.eventsCreated },
    { label: "Event years — new", value: s.eventYearsCreated },
    { label: "Event links", value: s.participationCreated },
    { label: "Contacts — new", value: s.contactsCreated },
    { label: "Duplicates skipped", value: s.duplicatesFound },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-border bg-background px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{it.label}</div>
          <div className="mt-1 text-xl font-semibold">{it.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function Warnings({ warnings }: { warnings: string[] }) {
  return (
    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" /> {warnings.length} warning{warnings.length > 1 ? "s" : ""}
      </div>
      <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
        {warnings.slice(0, 100).map((w, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <FileSpreadsheet className="mt-0.5 h-3 w-3 shrink-0" /> {w}
          </li>
        ))}
      </ul>
    </div>
  );
}
