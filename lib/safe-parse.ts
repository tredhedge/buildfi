// Safe JSON parsing + prompt-input scrubbing for untrusted data flowing into
// Anthropic prompts and Object.assign merges in the webhook + report pipelines.
//
// Why this exists:
// - JSON.parse(str) followed by Object.assign(target, parsed) walks "__proto__"
//   as a regular property, allowing prototype pollution from AI/Stripe-roundtripped
//   inputs. The reviver below strips the dangerous keys at parse time.
// - Quiz fields originate as user input at /api/checkout, ride through Stripe
//   metadata, and land in Anthropic prompts. We scrub control chars and cap
//   length to defang prompt-injection attempts before the prompt builder runs.

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * JSON.parse with a reviver that drops prototype-pollution keys.
 * Use everywhere AI output, quiz JSON, or any other untrusted JSON is decoded.
 */
export function safeJsonParse<T = unknown>(text: string): T {
  return JSON.parse(text, (key, value) => {
    if (DANGEROUS_KEYS.has(key)) return undefined;
    return value;
  }) as T;
}

/**
 * Recursively strip dangerous keys from an already-parsed object.
 * Use as a defense-in-depth pass before Object.assign on AI batch results.
 */
export function stripDangerousKeys<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripDangerousKeys(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(k)) continue;
    out[k] = stripDangerousKeys(v);
  }
  return out as T;
}

/**
 * Scrub a single user-supplied string before it lands in an Anthropic prompt.
 * - Strips control characters (newlines + delimiters that frame system prompts).
 * - Caps to maxLen to bound a single field's prompt-injection surface.
 */
export function scrubPromptString(s: unknown, maxLen: number = 200): string {
  if (s == null) return "";
  const str = String(s);
  // Strip ASCII control chars except space; this also kills CR/LF used to
  // smuggle "Ignore prior instructions" payloads with their own framing.
  const cleaned = str.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, " ");
  return cleaned.slice(0, maxLen).trim();
}

/**
 * Recursively scrub all string leaves in an object — drop dangerous keys at
 * the same time. Use on the parsed quiz answers before passing to prompt builders.
 */
export function scrubPromptObject<T>(value: T, maxLen: number = 200): T {
  if (value == null) return value;
  if (typeof value === "string") return scrubPromptString(value, maxLen) as unknown as T;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => scrubPromptObject(v, maxLen)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(k)) continue;
    out[k] = scrubPromptObject(v, maxLen);
  }
  return out as T;
}
