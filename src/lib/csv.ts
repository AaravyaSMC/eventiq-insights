// Tiny dependency-free CSV helpers for the import flow.
// Handles quoted fields, embedded commas, quotes ("") and CRLF/LF newlines.

export const IMPORT_COLUMNS = [
  "S.No",
  "Event Name",
  "Year",
  "Company Name",
  "Company Website",
  "Country",
  "Location",
  "Industry",
  "Contact Name",
  "Designation",
  "Email",
  "Phone",
  "LinkedIn",
] as const;

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Strip a UTF-8 BOM if present.
  const clean = text.replace(/^﻿/, "");
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      field = "";
      record = [];
    } else {
      field += ch;
    }
  }
  if (field.length || record.length) {
    record.push(field);
    records.push(record);
  }

  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ""));
  if (!nonEmpty.length) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}

function escapeCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(headers: readonly string[], rows: string[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const r of rows) lines.push(r.map(escapeCell).join(","));
  return lines.join("\r\n");
}

/** Trigger a browser download of the blank import template (with a sample row). */
export function downloadTemplate(): void {
  const sample = [
    "1",
    "GITEX Global",
    "2025",
    "Acme Analytics",
    "acme.example.com",
    "United Arab Emirates",
    "Dubai",
    "Technology",
    "Jane Doe",
    "Head of Partnerships",
    "jane@acme.example",
    "+971 50 000 0000",
    "linkedin.com/in/janedoe",
  ];
  const csv = toCsv(IMPORT_COLUMNS, [sample]);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "eventiq-import-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
