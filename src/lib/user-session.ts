import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "fleama_uid";
const MAX_AGE_SEC = 60 * 60 * 24 * 400; // ~13 months

function signingSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    "fleama-dev-session-secret"
  );
}

function sign(userId: string): string {
  return createHmac("sha256", signingSecret()).update(userId).digest("hex");
}

function encode(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

function decode(value: string | undefined): string | null {
  if (!value) return null;
  const i = value.lastIndexOf(".");
  if (i <= 0) return null;
  const userId = value.slice(0, i);
  const sig = value.slice(i + 1);
  if (!userId || !sig) return null;
  const expected = sign(userId);
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId;
}

/**
 * Resolve (or create) a stable anonymous user id for Stripe linkage.
 * Cookie is httpOnly + signed to prevent casual spoofing.
 */
export async function getOrCreateUserId(): Promise<{
  userId: string;
  created: boolean;
}> {
  const jar = await cookies();
  const existing = decode(jar.get(COOKIE_NAME)?.value);
  if (existing) {
    return { userId: existing, created: false };
  }

  const userId = randomUUID();
  jar.set(COOKIE_NAME, encode(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return { userId, created: true };
}

export async function getUserIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return decode(jar.get(COOKIE_NAME)?.value);
}
