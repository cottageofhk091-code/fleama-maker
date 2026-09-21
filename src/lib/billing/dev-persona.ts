/**
 * Local development persona for testing mosaic / pricing / auth UI.
 * Only meaningful when NODE_ENV === "development".
 */

export type DevPersona = "unauthenticated" | "free" | "paid";

const STORAGE_KEY = "fleama_dev_persona";
const EVENT_NAME = "fleama-dev-persona";

export function isDevPersonaEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function getDevPersona(): DevPersona | null {
  if (!isDevPersonaEnabled()) return null;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === "unauthenticated" || raw === "free" || raw === "paid") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function setDevPersona(persona: DevPersona | null): void {
  if (!isDevPersonaEnabled()) return;
  if (typeof window === "undefined") return;
  try {
    if (persona == null) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, persona);
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: persona }),
  );
}

export function subscribeDevPersona(
  listener: (persona: DevPersona | null) => void,
): () => void {
  if (!isDevPersonaEnabled() || typeof window === "undefined") {
    return () => undefined;
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    listener(getDevPersona());
  };
  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<DevPersona | null>).detail;
    listener(detail ?? getDevPersona());
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT_NAME, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT_NAME, onCustom);
  };
}
