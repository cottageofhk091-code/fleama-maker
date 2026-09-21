import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

function readEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/**
 * Browser/server anon client.
 * Browser: auth session persisted (ログイン用).
 * Server: no session persistence (ログ送信用).
 */
export function getSupabase(): SupabaseClient | null {
  const env = readEnv();
  if (!env) return null;

  const isBrowser = typeof window !== "undefined";
  if (isBrowser) {
    if (!browserClient) {
      browserClient = createClient(env.url, env.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    return browserClient;
  }

  if (!serverClient) {
    serverClient = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serverClient;
}
