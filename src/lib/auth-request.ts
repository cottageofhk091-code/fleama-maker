import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

/**
 * API Route 向け: Authorization: Bearer <access_token> からユーザーを検証
 */
export async function getRequestAuthUser(
  request: Request,
): Promise<User | null> {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const jwt = header.slice(7).trim();
  if (!jwt) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) {
    return null;
  }
  return data.user;
}
