import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

// -------------------------------------------------------------------------
// AI-powered server functions: business-card scanning (Claude vision) and
// company enrichment from the web (Claude + web fetch tool). These run ONLY
// on the server; both the Anthropic key and the Supabase service_role key are
// imported dynamically so they never enter the client bundle.
// -------------------------------------------------------------------------

const normName = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const normWebsite = (s: string | null | undefined) =>
  (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

// ----- Scan business cards (photo -> structured cards) -----
export type ScannedCard = {
  name: string | null;
  designation: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  country: string | null;
};

const CARD_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["cards"],
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "designation", "company", "email", "phone", "website", "linkedin", "country"],
        properties: {
          name: { type: ["string", "null"], description: "Person's full name" },
          designation: { type: ["string", "null"], description: "Job title / role" },
          company: { type: ["string", "null"], description: "Company or organization name" },
          email: { type: ["string", "null"] },
          phone: { type: ["string", "null"], description: "Primary phone number incl. country code if printed" },
          website: { type: ["string", "null"], description: "Company website domain or URL" },
          linkedin: { type: ["string", "null"], description: "LinkedIn URL or handle if printed" },
          country: { type: ["string", "null"], description: "Country, inferred from address or phone country code" },
        },
      },
    },
  },
} as const;

const ScanSchema = z.object({
  // data URL like "data:image/jpeg;base64,..."
  dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/),
});

export const scanCards = createServerFn({ method: "POST" })
  .validator((data: unknown) => ScanSchema.parse(data))
  .handler(async ({ data }): Promise<{ scanId: string | null; cards: ScannedCard[] }> => {
    const { getAnthropic, CLAUDE_MODEL } = await import("./anthropic.server");
    const { supabaseAdmin } = await import("./supabase.server");
    const client = getAnthropic();

    const [meta, b64] = data.dataUrl.split(",");
    const mime = meta.slice(meta.indexOf(":") + 1, meta.indexOf(";")) as
      | "image/jpeg"
      | "image/png"
      | "image/webp";

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: CARD_JSON_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
            {
              type: "text",
              text:
                "This photo contains one or more business cards (possibly several laid out in a frame). " +
                "Extract every distinct card into the `cards` array — one entry per card, even if partially visible. " +
                "Transcribe exactly what is printed; use null for fields not present. " +
                "Normalize emails to lowercase. For `country`, infer from the address or phone country code when possible.",
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("The AI declined to process this image. Try a clearer photo of the cards.");
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No parse result returned. Try again with a clearer photo.");
    }
    const parsed = JSON.parse(textBlock.text) as { cards: ScannedCard[] };
    const cards = (parsed.cards ?? []).filter(
      (c) => c.name || c.company || c.email || c.phone,
    );

    // Audit trail: store the original photo + parse result (best-effort).
    let scanId: string | null = null;
    try {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const up = await supabaseAdmin.storage
        .from("card-scans")
        .upload(path, bytes, { contentType: mime });
      const ins = await supabaseAdmin
        .from("card_scans")
        .insert({
          image_path: up.error ? null : path,
          cards: cards,
          cards_detected: cards.length,
        })
        .select("id")
        .single();
      if (!ins.error) scanId = ins.data.id;
    } catch {
      // audit failure should never block the scan result
    }

    return { scanId, cards };
  });

// ----- Commit reviewed cards (create companies/contacts/participation) -----
const CommitSchema = z.object({
  scanId: z.string().nullable().optional(),
  eventSlug: z.string().optional(),
  eventYear: z.number().int().optional(),
  cards: z
    .array(
      z.object({
        name: z.string().nullable(),
        designation: z.string().nullable(),
        company: z.string().nullable(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        website: z.string().nullable(),
        linkedin: z.string().nullable(),
        country: z.string().nullable(),
      }),
    )
    .min(1)
    .max(50),
});

export type CommitSummary = {
  contactsCreated: number;
  companiesCreated: number;
  companiesMatched: number;
  duplicatesSkipped: number;
  warnings: string[];
};

export const commitCards = createServerFn({ method: "POST" })
  .validator((data: unknown) => CommitSchema.parse(data))
  .handler(async ({ data }): Promise<CommitSummary> => {
    const { supabaseAdmin } = await import("./supabase.server");

    const summary: CommitSummary = {
      contactsCreated: 0,
      companiesCreated: 0,
      companiesMatched: 0,
      duplicatesSkipped: 0,
      warnings: [],
    };

    // Resolve the event edition once (optional).
    let eventYearId: string | null = null;
    if (data.eventSlug && data.eventYear != null) {
      const ev = await supabaseAdmin.from("events").select("id").eq("slug", data.eventSlug).single();
      if (ev.error) throw new Error(`Event lookup failed: ${ev.error.message}`);
      const ey = await supabaseAdmin
        .from("event_years")
        .select("id")
        .eq("event_id", ev.data.id)
        .eq("year", data.eventYear)
        .single();
      if (ey.error) throw new Error(`Event year lookup failed: ${ey.error.message}`);
      eventYearId = ey.data.id;
    }

    // Preload for dedup.
    const [companiesRes, contactsRes, partRes] = await Promise.all([
      supabaseAdmin.from("companies").select("id,name,website"),
      supabaseAdmin.from("contacts").select("company_id,email"),
      supabaseAdmin.from("company_event_participation").select("company_id,event_year_id"),
    ]);
    for (const r of [companiesRes, contactsRes, partRes]) {
      if (r.error) throw new Error(r.error.message);
    }
    const companyByName = new Map<string, string>();
    const companyByWeb = new Map<string, string>();
    for (const c of companiesRes.data ?? []) {
      if (c.name) companyByName.set(normName(c.name), c.id);
      if (c.website) companyByWeb.set(normWebsite(c.website), c.id);
    }
    const contactSeen = new Set<string>();
    for (const c of contactsRes.data ?? []) {
      if (c.company_id && c.email) contactSeen.add(`${c.company_id}:${normName(c.email)}`);
    }
    const partSeen = new Set<string>();
    for (const p of partRes.data ?? []) {
      partSeen.add(`${p.company_id}:${p.event_year_id}`);
    }

    for (let i = 0; i < data.cards.length; i++) {
      const card = data.cards[i];
      const label = `Card ${i + 1}${card.name ? ` (${card.name})` : ""}`;

      // Company: find or create.
      let companyId: string | null = null;
      if (card.company) {
        companyId =
          companyByName.get(normName(card.company)) ??
          (card.website ? companyByWeb.get(normWebsite(card.website)) ?? null : null);
        if (companyId) {
          summary.companiesMatched++;
        } else {
          const ins = await supabaseAdmin
            .from("companies")
            .insert({
              name: card.company,
              website: card.website || null,
              country: card.country || null,
            })
            .select("id")
            .single();
          if (ins.error) {
            summary.warnings.push(`${label}: company insert failed — ${ins.error.message}`);
            continue;
          }
          const newId: string = ins.data.id;
          companyId = newId;
          summary.companiesCreated++;
          companyByName.set(normName(card.company), newId);
          if (card.website) companyByWeb.set(normWebsite(card.website), newId);
        }
      }

      // Participation link (company <-> event edition).
      if (companyId && eventYearId && !partSeen.has(`${companyId}:${eventYearId}`)) {
        const ins = await supabaseAdmin.from("company_event_participation").insert({
          company_id: companyId,
          event_year_id: eventYearId,
          source_file: "card-scan",
          extra_fields: {},
        });
        if (!ins.error) partSeen.add(`${companyId}:${eventYearId}`);
      }

      // Contact (dedupe by company + email).
      if (!card.name && !card.email && !card.phone) continue;
      const dupKey = companyId && card.email ? `${companyId}:${normName(card.email)}` : null;
      if (dupKey && contactSeen.has(dupKey)) {
        summary.duplicatesSkipped++;
        continue;
      }
      const ins = await supabaseAdmin.from("contacts").insert({
        company_id: companyId,
        event_year_id: eventYearId,
        name: card.name || null,
        designation: card.designation || null,
        email: card.email || null,
        phone: card.phone || null,
        linkedin: card.linkedin || null,
      });
      if (ins.error) {
        summary.warnings.push(`${label}: contact insert failed — ${ins.error.message}`);
      } else {
        summary.contactsCreated++;
        if (dupKey) contactSeen.add(dupKey);
      }
    }

    if (data.scanId) {
      await supabaseAdmin
        .from("card_scans")
        .update({ committed: true, event_year_id: eventYearId })
        .eq("id", data.scanId);
    }

    return summary;
  });

// ----- Enrich a company from its website -----
export type EnrichmentProposal = {
  description: string | null;
  industry: string | null;
  services: string[];
  primaryService: string | null;
  businessModel: string | null;
  targetMarket: string | null;
  headquarters: string | null;
  foundedYear: number | null;
  employeesRange: string | null;
  linkedin: string | null;
  summaryNote: string | null;
};

const ENRICH_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "description", "industry", "services", "primaryService", "businessModel",
    "targetMarket", "headquarters", "foundedYear", "employeesRange", "linkedin", "summaryNote",
  ],
  properties: {
    description: { type: ["string", "null"], description: "2-3 sentence factual description of what the company does" },
    industry: { type: ["string", "null"], description: "Primary industry, short label" },
    services: { type: "array", items: { type: "string" }, description: "Named products/services (max 8)" },
    primaryService: { type: ["string", "null"] },
    businessModel: { type: ["string", "null"], description: "e.g. B2B SaaS, Services, Marketplace" },
    targetMarket: { type: ["string", "null"], description: "Who they sell to" },
    headquarters: { type: ["string", "null"], description: "City, Country if stated" },
    foundedYear: { type: ["integer", "null"] },
    employeesRange: { type: ["string", "null"], description: "e.g. 51-200, only if stated" },
    linkedin: { type: ["string", "null"], description: "LinkedIn company page URL if found" },
    summaryNote: { type: ["string", "null"], description: "3-5 bullet internal CRM note: positioning, notable clients/partners, anything useful for a sales conversation" },
  },
} as const;

const EnrichSchema = z.object({ companyId: z.string().min(1) });

export const enrichCompany = createServerFn({ method: "POST" })
  .validator((data: unknown) => EnrichSchema.parse(data))
  .handler(async ({ data }): Promise<{ proposal: EnrichmentProposal; website: string }> => {
    const { getAnthropic, CLAUDE_MODEL } = await import("./anthropic.server");
    const { supabaseAdmin } = await import("./supabase.server");
    const client = getAnthropic();

    const company = await supabaseAdmin
      .from("companies")
      .select("id,name,website")
      .eq("id", data.companyId)
      .single();
    if (company.error) throw new Error(company.error.message);
    if (!company.data.website) {
      throw new Error("This company has no website on record — add one first, then enrich.");
    }

    const rawSite = company.data.website.trim();
    const url = /^https?:\/\//i.test(rawSite) ? rawSite : `https://${rawSite}`;
    const domain = normWebsite(rawSite).split("/")[0];

    let messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content:
          `Research the company "${company.data.name}" using its website: ${url}\n\n` +
          "Fetch the site (and, if useful, obvious subpages like /about, /services, /products reachable from it). " +
          "Fill the JSON fields strictly from what the site states — do not guess. Use null when the site doesn't say. " +
          "Keep `description` factual and concise. `summaryNote` is an internal CRM note for our sales team.",
      },
    ];

    let response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      tools: [
        {
          type: "web_fetch_20260209",
          name: "web_fetch",
          max_uses: 6,
          allowed_domains: [domain, `www.${domain}`],
        },
      ],
      output_config: { format: { type: "json_schema", schema: ENRICH_JSON_SCHEMA } },
      messages,
    });

    // Server-side tool loops can pause; resume until done (bounded).
    let continuations = 0;
    while (response.stop_reason === "pause_turn" && continuations < 5) {
      continuations++;
      messages = [...messages, { role: "assistant", content: response.content }];
      response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        thinking: { type: "adaptive" },
        tools: [
          {
            type: "web_fetch_20260209",
            name: "web_fetch",
            max_uses: 6,
            allowed_domains: [domain, `www.${domain}`],
          },
        ],
        output_config: { format: { type: "json_schema", schema: ENRICH_JSON_SCHEMA } },
        messages,
      });
    }

    if (response.stop_reason === "refusal") {
      throw new Error("The AI declined to process this website.");
    }
    const textBlock = [...response.content].reverse().find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Enrichment returned no result — the website may be unreachable.");
    }
    const proposal = JSON.parse(textBlock.text) as EnrichmentProposal;
    return { proposal, website: url };
  });

// ----- Apply an enrichment proposal (explicit user action) -----
const ApplyEnrichmentSchema = z.object({
  companyId: z.string().min(1),
  fields: z.object({
    description: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    services: z.array(z.string()).optional(),
    primaryService: z.string().nullable().optional(),
    businessModel: z.string().nullable().optional(),
    targetMarket: z.string().nullable().optional(),
    headquarters: z.string().nullable().optional(),
    foundedYear: z.number().int().nullable().optional(),
    employeesRange: z.string().nullable().optional(),
    linkedin: z.string().nullable().optional(),
  }),
  summaryNote: z.string().nullable().optional(),
});

export const applyEnrichment = createServerFn({ method: "POST" })
  .validator((data: unknown) => ApplyEnrichmentSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("./supabase.server");
    const f = data.fields;
    const update: Record<string, unknown> = { enriched_at: new Date().toISOString() };
    if (f.description != null) update.description = f.description;
    if (f.industry != null) update.industry = f.industry;
    if (f.services && f.services.length) update.services = f.services;
    if (f.primaryService != null) update.primary_service = f.primaryService;
    if (f.businessModel != null) update.business_model = f.businessModel;
    if (f.targetMarket != null) update.target_market = f.targetMarket;
    if (f.headquarters != null) update.headquarters = f.headquarters;
    if (f.foundedYear != null) update.founded_year = f.foundedYear;
    if (f.employeesRange != null) update.employees_range = f.employeesRange;
    if (f.linkedin != null) update.linkedin = f.linkedin;

    const upd = await supabaseAdmin.from("companies").update(update).eq("id", data.companyId);
    if (upd.error) throw new Error(upd.error.message);

    if (data.summaryNote) {
      await supabaseAdmin.from("company_notes").insert({
        company_id: data.companyId,
        body: `🤖 Website enrichment summary:\n${data.summaryNote}`,
      });
    }
    return { ok: true };
  });
