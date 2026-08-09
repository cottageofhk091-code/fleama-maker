import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const EMAIL_RE =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
const JP_PHONE_RE =
  /0\d{1,4}[-−ー]?\d{1,4}[-−ー]?\d{3,4}/g;
/** Common Japanese name patterns like 山田太郎 / 山田 太郎 */
const JP_NAME_RE =
  /(?:氏名|お名前|名前)[：:\s]*([一-龯ぁ-んァ-ヶー]{2,8}(?:\s+[一-龯ぁ-んァ-ヶー]{1,8})?)/g;
const LATIN_NAME_HINT_RE =
  /(?:name|full[\s_-]?name|user[\s_-]?name)[：:=\s]+([A-Za-z][A-Za-z\s.'-]{1,40})/gi;

const MASK = "[REDACTED]";

export function scrubPiiText(value: string): string {
  let result = value;
  result = result.replace(EMAIL_RE, MASK);
  result = result.replace(JP_PHONE_RE, MASK);
  result = result.replace(PHONE_RE, MASK);
  result = result.replace(JP_NAME_RE, `名前: ${MASK}`);
  result = result.replace(LATIN_NAME_HINT_RE, `name: ${MASK}`);
  return result;
}

function scrubUnknown(value: unknown, depth = 0): unknown {
  if (depth > 8 || value == null) return value;
  if (typeof value === "string") return scrubPiiText(value);
  if (Array.isArray(value)) return value.map((item) => scrubUnknown(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("email") ||
        lower.includes("phone") ||
        lower.includes("tel") ||
        lower === "name" ||
        lower === "fullname" ||
        lower === "username" ||
        lower.includes("氏名") ||
        lower.includes("名前")
      ) {
        out[key] = MASK;
      } else {
        out[key] = scrubUnknown(nested, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/**
 * Sentry beforeSend hook — masks emails, phone numbers, and personal names.
 */
export function scrubSentryEvent(
  event: ErrorEvent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hint?: EventHint,
): ErrorEvent | null {
  if (event.message) {
    event.message = scrubPiiText(event.message);
  }

  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.value) {
        exception.value = scrubPiiText(exception.value);
      }
    }
  }

  if (event.request) {
    if (typeof event.request.data === "string") {
      event.request.data = scrubPiiText(event.request.data);
    } else if (event.request.data) {
      event.request.data = scrubUnknown(event.request.data) as typeof event.request.data;
    }
    if (event.request.headers) {
      event.request.headers = scrubUnknown(
        event.request.headers,
      ) as typeof event.request.headers;
    }
    if (event.request.query_string) {
      if (typeof event.request.query_string === "string") {
        event.request.query_string = scrubPiiText(event.request.query_string);
      }
    }
    if (event.request.cookies) {
      event.request.cookies = scrubUnknown(
        event.request.cookies,
      ) as typeof event.request.cookies;
    }
  }

  if (event.user) {
    if (event.user.email) event.user.email = MASK;
    if (event.user.username) event.user.username = MASK;
    if (event.user.ip_address) event.user.ip_address = MASK;
    if (typeof event.user.id === "string") {
      event.user.id = scrubPiiText(event.user.id);
    }
  }

  if (event.extra) {
    event.extra = scrubUnknown(event.extra) as typeof event.extra;
  }

  if (event.contexts) {
    event.contexts = scrubUnknown(event.contexts) as typeof event.contexts;
  }

  if (event.breadcrumbs) {
    for (const crumb of event.breadcrumbs) {
      if (crumb.message) crumb.message = scrubPiiText(crumb.message);
      if (crumb.data) crumb.data = scrubUnknown(crumb.data) as typeof crumb.data;
    }
  }

  return event;
}
