"use client";

import { getSupabase } from "@/lib/supabase";

/** fetch 用: ログイン中なら Authorization Bearer を付与 */
export async function authJsonHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const supabase = getSupabase();
    if (!supabase) return headers;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return headers;
}
