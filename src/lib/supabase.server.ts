import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY Supabase client using the service_role key.
//
// The service_role key bypasses Row Level Security, so this module must NEVER
// be imported into client/browser code. It is only used inside TanStack Start
// server functions (which run on the server). The guard below throws loudly if
// it is ever evaluated in a browser bundle.
if (typeof window !== "undefined") {
  throw new Error("supabase.server.ts must never be imported into client code.");
}

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ?? (import.meta.env.VITE_SUPABASE_URL as string | undefined);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing server Supabase env. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
      "(the latter has NO VITE_ prefix and must be available server-side).",
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
