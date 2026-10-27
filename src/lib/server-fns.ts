import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// -------------------------------------------------------------------------
// Server-side write functions. These run ONLY on the server and use the
// service_role Supabase client (imported dynamically so it never enters the
// client bundle). The browser calls these like RPCs; the key stays server-side.
// -------------------------------------------------------------------------

// ----- helpers -----
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "event";

const normName = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const normWebsite = (s: string | null | undefined) =>
  (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

// Classify a raw spreadsheet row (header -> value) into canonical CRM fields.
// Any unrecognized columns are preserved in `extras` (stored as extra_fields).
type RawRow = Record<string, string>;
type NormRow = {
  serial: number | null;
  eventName: string;
  year: number | null;
  companyName: string;
  website: string;
  country: string;
  location: string;
  industry: string;
  contactName: string;
  designation: string;
  email: string;
  phone: string;
  linkedin: string;
  extras: Record<string, string>;
};

function classify(row: RawRow): NormRow {
  const matched = new Set<string>();
  const grab = (re: RegExp) => {
    for (const k of Object.keys(row)) {
      if (re.test(k)) {
        matched.add(k);
        return (row[k] ?? "").toString().trim();
      }
    }
    return "";
  };
  const serialRaw = grab(/^s\.?\s*no\.?$|serial|sr\.?\s*no/i);
  const eventName = grab(/event/i);
  const yearRaw = grab(/year/i);
  const companyName = grab(/company\s*name|^company$|organi[sz]ation|exhibitor/i);
  const website = grab(/website|web\s*site|url|domain/i);
  const country = grab(/country/i);
  const location = grab(/location|city|venue|headquarter/i);
  const industry = grab(/industry|sector|category/i);
  const contactName = grab(/contact\s*name|poc|person|attendee|delegate/i);
  const designation = grab(/designation|title|role|position/i);
  const email = grab(/e-?mail/i);
  const phone = grab(/phone|mobile|contact\s*number|tel/i);
  const linkedin = grab(/linkedin/i);

  const extras: Record<string, string> = {};
  for (const k of Object.keys(row)) {
    if (!matched.has(k)) {
      const v = (row[k] ?? "").toString().trim();
      if (v) extras[k] = v;
    }
  }
  const yearNum = parseInt(yearRaw.replace(/[^\d]/g, ""), 10);
  const serialNum = parseInt(serialRaw.replace(/[^\d]/g, ""), 10);
  return {
    serial: Number.isNaN(serialNum) ? null : serialNum,
    eventName,
    year: Number.isNaN(yearNum) ? null : yearNum,
    companyName,
    website,
    country,
    location,
    industry,
    contactName,
    designation,
    email,
    phone,
    linkedin,
    extras,
  };
}

const ImportSchema = z.object({
  fileName: z.string().default("import.csv"),
  commit: z.boolean().default(false),
  rows: z.array(z.record(z.string(), z.string())).max(20000),
});

export type ImportSummary = {
  committed: boolean;
  rowsProcessed: number;
  companiesCreated: number;
  companiesMatched: number;
  eventsCreated: number;
  eventYearsCreated: number;
  participationCreated: number;
  contactsCreated: number;
  duplicatesFound: number;
  warnings: string[];
};

export const importRows = createServerFn({ method: "POST" })
  .validator((data: unknown) => ImportSchema.parse(data))
  .handler(async ({ data }): Promise<ImportSummary> => {
    const { supabaseAdmin } = await import("./supabase.server");
    const { fileName, commit, rows } = data;

    // Preload existing records for dedup.
    const [companiesRes, eventsRes, eventYearsRes, contactsRes, partRes] = await Promise.all([
      supabaseAdmin.from("companies").select("id,name,website"),
      supabaseAdmin.from("events").select("id,name,slug"),
      supabaseAdmin.from("event_years").select("id,event_id,year"),
      supabaseAdmin.from("contacts").select("id,company_id,email"),
      supabaseAdmin.from("company_event_participation").select("company_id,event_year_id"),
    ]);
    for (const r of [companiesRes, eventsRes, eventYearsRes, contactsRes, partRes]) {
      if (r.error) throw new Error(r.error.message);
    }

    const companyByName = new Map<string, string>();
    const companyByWeb = new Map<string, string>();
    for (const c of companiesRes.data ?? []) {
      if (c.name) companyByName.set(normName(c.name), c.id);
      if (c.website) companyByWeb.set(normWebsite(c.website), c.id);
    }
    const eventByName = new Map<string, { id: string; slug: string }>();
    const slugs = new Set<string>();
    for (const e of eventsRes.data ?? []) {
      if (e.name) eventByName.set(normName(e.name), { id: e.id, slug: e.slug });
      if (e.slug) slugs.add(e.slug);
    }
    const eventYearByKey = new Map<string, string>(); // `${eventId}:${year}` -> id
    for (const ey of eventYearsRes.data ?? []) {
      eventYearByKey.set(`${ey.event_id}:${ey.year}`, ey.id);
    }
    const contactByKey = new Set<string>(); // `${companyId}:${email}`
    for (const c of contactsRes.data ?? []) {
      if (c.company_id && c.email) contactByKey.add(`${c.company_id}:${normName(c.email)}`);
    }
    const participationSeen = new Set<string>(); // `${companyId}:${eventYearId}` (seeded with existing links)
    for (const p of partRes.data ?? []) {
      if (p.company_id && p.event_year_id) participationSeen.add(`${p.company_id}:${p.event_year_id}`);
    }

    const summary: ImportSummary = {
      committed: commit,
      rowsProcessed: 0,
      companiesCreated: 0,
      companiesMatched: 0,
      eventsCreated: 0,
      eventYearsCreated: 0,
      participationCreated: 0,
      contactsCreated: 0,
      duplicatesFound: 0,
      warnings: [],
    };

    let synthetic = 0;
    const newId = () => `new-${++synthetic}`;

    for (let i = 0; i < rows.length; i++) {
      const row = classify(rows[i]);
      const label = row.serial != null ? `Row ${row.serial}` : `Row ${i + 1}`;
      if (!row.companyName && !row.eventName && !row.contactName && !row.email) {
        continue; // blank line
      }
      summary.rowsProcessed++;

      // --- Company (find or create) ---
      let companyId: string | null = null;
      if (row.companyName) {
        companyId =
          companyByName.get(normName(row.companyName)) ??
          (row.website ? companyByWeb.get(normWebsite(row.website)) ?? null : null);
        if (companyId) {
          summary.companiesMatched++;
        } else {
          summary.companiesCreated++;
          if (commit) {
            const ins = await supabaseAdmin
              .from("companies")
              .insert({
                name: row.companyName,
                website: row.website || null,
                country: row.country || null,
                headquarters: row.location || null,
                industry: row.industry || null,
              })
              .select("id")
              .single();
            if (ins.error) {
              summary.warnings.push(`${label}: company insert failed — ${ins.error.message}`);
              continue;
            }
            companyId = ins.data.id;
          } else {
            companyId = newId();
          }
          if (companyId) {
            companyByName.set(normName(row.companyName), companyId);
            if (row.website) companyByWeb.set(normWebsite(row.website), companyId);
          }
        }
      }

      // --- Event + event_year (find or create) ---
      let eventYearId: string | null = null;
      if (row.eventName) {
        if (row.year == null) {
          summary.warnings.push(`${label}: "${row.eventName}" has no Year — event link skipped.`);
        } else {
          let ev = eventByName.get(normName(row.eventName));
          if (!ev) {
            let slug = slugify(row.eventName);
            let n = 2;
            while (slugs.has(slug)) slug = `${slugify(row.eventName)}-${n++}`;
            slugs.add(slug);
            summary.eventsCreated++;
            let evId: string;
            if (commit) {
              const ins = await supabaseAdmin
                .from("events")
                .insert({ name: row.eventName, slug })
                .select("id")
                .single();
              if (ins.error) {
                summary.warnings.push(`${label}: event insert failed — ${ins.error.message}`);
                ev = undefined;
                evId = "";
              } else {
                evId = ins.data.id;
              }
            } else {
              evId = newId();
            }
            if (evId) {
              ev = { id: evId, slug };
              eventByName.set(normName(row.eventName), ev);
            }
          }
          if (ev) {
            const key = `${ev.id}:${row.year}`;
            eventYearId = eventYearByKey.get(key) ?? null;
            if (!eventYearId) {
              summary.eventYearsCreated++;
              if (commit) {
                const ins = await supabaseAdmin
                  .from("event_years")
                  .insert({ event_id: ev.id, year: row.year })
                  .select("id")
                  .single();
                if (ins.error) {
                  summary.warnings.push(`${label}: event_year insert failed — ${ins.error.message}`);
                } else {
                  eventYearId = ins.data.id;
                }
              } else {
                eventYearId = newId();
              }
              if (eventYearId) eventYearByKey.set(key, eventYearId);
            }
          }
        }
      }

      // --- Participation (link company <-> event_year) ---
      if (companyId && eventYearId) {
        const pkey = `${companyId}:${eventYearId}`;
        if (!participationSeen.has(pkey)) {
          participationSeen.add(pkey);
          if (commit) {
            const ins = await supabaseAdmin.from("company_event_participation").insert({
              company_id: companyId,
              event_year_id: eventYearId,
              source_row_number: row.serial,
              source_file: fileName,
              extra_fields: row.extras, // always an object ({} when no extra columns) — column is NOT NULL
            });
            if (ins.error) {
              participationSeen.delete(pkey);
              summary.warnings.push(`${label}: event link failed — ${ins.error.message}`);
            } else {
              summary.participationCreated++;
            }
          } else {
            summary.participationCreated++;
          }
        }
      }

      // --- Contact ---
      if (companyId && (row.contactName || row.email || row.phone)) {
        const ckey = `${companyId}:${normName(row.email)}`;
        const dup = row.email ? contactByKey.has(ckey) : false;
        if (dup) {
          summary.duplicatesFound++;
        } else {
          if (row.email) contactByKey.add(ckey);
          summary.contactsCreated++;
          if (commit) {
            const ins = await supabaseAdmin.from("contacts").insert({
              company_id: companyId,
              event_year_id: eventYearId,
              name: row.contactName || null,
              designation: row.designation || null,
              email: row.email || null,
              phone: row.phone || null,
              linkedin: row.linkedin || null,
            });
            if (ins.error) summary.warnings.push(`${label}: contact failed — ${ins.error.message}`);
          }
        }
      }
    }

    if (commit) {
      await supabaseAdmin.from("import_history").insert({
        file_name: fileName,
        rows_processed: summary.rowsProcessed,
        events_created: summary.eventsCreated,
        companies_created: summary.companiesCreated,
        companies_updated: summary.companiesMatched,
        contacts_created: summary.contactsCreated,
        duplicates_found: summary.duplicatesFound,
        warnings: summary.warnings.length ? summary.warnings : null,
      });
    }

    return summary;
  });

// ----- Manual "Add Event" -----
const AddEventSchema = z.object({
  name: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  location: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
});

export const addEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) => AddEventSchema.parse(data))
  .handler(async ({ data }): Promise<{ slug: string }> => {
    const { supabaseAdmin } = await import("./supabase.server");

    // Reuse the event if one with the same name already exists (just add the year).
    const existing = await supabaseAdmin.from("events").select("id,name,slug");
    if (existing.error) throw new Error(existing.error.message);
    const match = (existing.data ?? []).find((e) => normName(e.name) === normName(data.name));

    let eventId: string;
    let slug: string;
    if (match) {
      eventId = match.id;
      slug = match.slug;
    } else {
      // "new" is reserved by the /events/new route.
      const taken = new Set([...(existing.data ?? []).map((e) => e.slug), "new"]);
      slug = slugify(data.name);
      let n = 2;
      while (taken.has(slug)) slug = `${slugify(data.name)}-${n++}`;
      const ins = await supabaseAdmin
        .from("events")
        .insert({
          name: data.name,
          slug,
          location: data.location || null,
          website: data.website || null,
          description: data.description || null,
        })
        .select("id")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      eventId = ins.data.id;
    }

    // Add the edition (ignore if that year already exists for this event).
    const year = await supabaseAdmin
      .from("event_years")
      .upsert({ event_id: eventId, year: data.year }, { onConflict: "event_id,year", ignoreDuplicates: true });
    if (year.error) throw new Error(year.error.message);

    return { slug };
  });

// ----- Manual "Add Company" -----
const AddCompanySchema = z.object({
  name: z.string().min(1),
  website: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  linkedin: z.string().optional(),
  // Optional source: link the company to an event edition it was met at.
  eventSlug: z.string().optional(),
  eventYear: z.number().int().optional(),
});

export const addCompany = createServerFn({ method: "POST" })
  .validator((data: unknown) => AddCompanySchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("./supabase.server");
    const ins = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.name,
        website: data.website || null,
        country: data.country || null,
        industry: data.industry || null,
        description: data.description || null,
        linkedin: data.linkedin || null,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    const companyId = ins.data.id;

    if (data.eventSlug && data.eventYear != null) {
      const ev = await supabaseAdmin.from("events").select("id").eq("slug", data.eventSlug).single();
      if (ev.error) throw new Error(`Company created, but event lookup failed: ${ev.error.message}`);
      const ey = await supabaseAdmin
        .from("event_years")
        .select("id")
        .eq("event_id", ev.data.id)
        .eq("year", data.eventYear)
        .single();
      if (ey.error) throw new Error(`Company created, but event year lookup failed: ${ey.error.message}`);
      const part = await supabaseAdmin.from("company_event_participation").insert({
        company_id: companyId,
        event_year_id: ey.data.id,
        source_file: "manual",
        extra_fields: {},
      });
      if (part.error) throw new Error(`Company created, but event link failed: ${part.error.message}`);
    }

    return { id: companyId };
  });

// ----- Set an event cover image (from a cropped data URL) -----
const SetCoverSchema = z.object({
  slug: z.string().min(1),
  // data URL like "data:image/jpeg;base64,...."
  dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/),
});

export const setEventCover = createServerFn({ method: "POST" })
  .validator((data: unknown) => SetCoverSchema.parse(data))
  .handler(async ({ data }): Promise<{ coverUrl: string }> => {
    const { supabaseAdmin } = await import("./supabase.server");
    const [meta, b64] = data.dataUrl.split(",");
    const mime = meta.slice(meta.indexOf(":") + 1, meta.indexOf(";"));
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

    // Runtime-agnostic base64 -> bytes (works on Node and Cloudflare Workers).
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const path = `${data.slug}.${ext}`;
    const up = await supabaseAdmin.storage
      .from("event-covers")
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (up.error) throw new Error(up.error.message);

    const { data: pub } = supabaseAdmin.storage.from("event-covers").getPublicUrl(path);
    // Cache-bust so the new image shows immediately after re-upload.
    const coverUrl = `${pub.publicUrl}?t=${Date.now()}`;

    const upd = await supabaseAdmin.from("events").update({ cover_url: coverUrl }).eq("slug", data.slug);
    if (upd.error) throw new Error(upd.error.message);

    return { coverUrl };
  });

// ----- Company notes -----
const AddNoteSchema = z.object({
  companyId: z.string().min(1),
  body: z.string().min(1).max(10000),
});

export const addCompanyNote = createServerFn({ method: "POST" })
  .validator((data: unknown) => AddNoteSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("./supabase.server");
    const ins = await supabaseAdmin
      .from("company_notes")
      .insert({ company_id: data.companyId, body: data.body })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    return { id: ins.data.id };
  });

export const deleteCompanyNote = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("./supabase.server");
    const del = await supabaseAdmin.from("company_notes").delete().eq("id", data.id);
    if (del.error) throw new Error(del.error.message);
    return { ok: true };
  });

// ----- Company attachments (private bucket, served via signed URLs) -----
const UploadAttachmentSchema = z.object({
  companyId: z.string().min(1),
  fileName: z.string().min(1).max(200),
  // data URL like "data:application/pdf;base64,...."
  dataUrl: z.string().regex(/^data:[\w.+-]+\/[\w.+-]+;base64,/),
});

export const uploadAttachment = createServerFn({ method: "POST" })
  .validator((data: unknown) => UploadAttachmentSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("./supabase.server");
    const [meta, b64] = data.dataUrl.split(",");
    const mime = meta.slice(meta.indexOf(":") + 1, meta.indexOf(";"));

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.length > 25 * 1024 * 1024) throw new Error("File too large (max 25 MB).");

    const safeName = data.fileName.replace(/[^\w.\- ]+/g, "_");
    const path = `${data.companyId}/${crypto.randomUUID()}-${safeName}`;
    const up = await supabaseAdmin.storage
      .from("company-attachments")
      .upload(path, bytes, { contentType: mime });
    if (up.error) throw new Error(up.error.message);

    const ins = await supabaseAdmin
      .from("company_attachments")
      .insert({
        company_id: data.companyId,
        file_name: data.fileName,
        storage_path: path,
        mime_type: mime,
        size_bytes: bytes.length,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    return { id: ins.data.id };
  });

export const deleteAttachment = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("./supabase.server");
    const row = await supabaseAdmin
      .from("company_attachments")
      .select("storage_path")
      .eq("id", data.id)
      .single();
    if (row.error) throw new Error(row.error.message);
    await supabaseAdmin.storage.from("company-attachments").remove([row.data.storage_path]);
    const del = await supabaseAdmin.from("company_attachments").delete().eq("id", data.id);
    if (del.error) throw new Error(del.error.message);
    return { ok: true };
  });

/** Short-lived signed URL for downloading a private attachment. */
export const getAttachmentUrl = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("./supabase.server");
    const row = await supabaseAdmin
      .from("company_attachments")
      .select("storage_path")
      .eq("id", data.id)
      .single();
    if (row.error) throw new Error(row.error.message);
    const signed = await supabaseAdmin.storage
      .from("company-attachments")
      .createSignedUrl(row.data.storage_path, 3600);
    if (signed.error) throw new Error(signed.error.message);
    return { url: signed.data.signedUrl };
  });

// ----- Manual "Add Contact" -----
const AddContactSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
  designation: z.string().optional(),
  department: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  linkedin: z.string().optional(),
});

export const addContact = createServerFn({ method: "POST" })
  .validator((data: unknown) => AddContactSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("./supabase.server");
    const ins = await supabaseAdmin
      .from("contacts")
      .insert({
        company_id: data.companyId,
        name: data.name,
        designation: data.designation || null,
        department: data.department || null,
        email: data.email || null,
        phone: data.phone || null,
        linkedin: data.linkedin || null,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    return { id: ins.data.id };
  });
