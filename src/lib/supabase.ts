import { createClient } from "@supabase/supabase-js";

// Browser-safe Supabase client.
// Uses the public "anon" key — Row Level Security in Supabase is what protects
// your data, so this key is safe to ship to the client. NEVER import the
// service_role key here; it would be bundled into the browser.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
  );
}

const isBrowser = typeof window !== "undefined";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Sessions persist in the browser (login gate); during SSR there is no
    // localStorage, so persistence/refresh stay off on the server.
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: false,
  },
});
