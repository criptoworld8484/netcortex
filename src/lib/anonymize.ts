/**
 * Local anonymizer: replaces identifying values (IPs, MACs, FQDNs, emails,
 * usernames, ASNs) with typed placeholders like <IP_1>. The mapping
 * (original -> placeholder) NEVER leaves the machine: only placeholder text
 * is sent to the AI provider, and the mapping is used locally to restore
 * real values in the answer.
 */

export interface AnonResult {
  text: string;
  /** original value -> placeholder */
  mapping: Record<string, string>;
}

class Allocator {
  private counters = new Map<string, number>();
  private map = new Map<string, string>();

  alloc(type: string, original: string): string {
    const existing = this.map.get(original);
    if (existing) return existing;
    const n = (this.counters.get(type) ?? 0) + 1;
    this.counters.set(type, n);
    const ph = `<${type}_${n}>`;
    this.map.set(original, ph);
    return ph;
  }

  toJSON(): Record<string, string> {
    return Object.fromEntries(this.map);
  }
}

const FQDN_TLDS =
  "com|net|org|es|eu|io|dev|local|lan|internal|corp|info|co|uk|fr|de|it|pt|nl|us|gov|edu|int|cloud|tech|online|site|biz|me";

interface Rule {
  name: string;
  type: string;
  re: RegExp;
  /** optional: keep surrounding syntax (e.g. user=john), replace only capture group */
  group?: number;
  /** custom filter: return the value to mask, or null to skip this match */
  pick?: (args: string[]) => string | null;
}

/** Words commonly following "user" in prose that are NOT usernames. */
const USER_STOPWORDS = new Set([
  "reports", "report", "reported", "says", "said", "noticed", "complains", "complained",
  "called", "calls", "is", "was", "has", "had", "cannot", "can", "could", "will",
  "would", "should", "login", "logins", "logged", "name", "account", "traffic",
  "session", "sessions", "error", "errors", "data", "profile", "group", "guide",
  "manual", "interface", "device", "the", "this", "that", "from", "with",
]);

const RULES: Rule[] = [
  { name: "email", type: "EMAIL", re: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g },
  { name: "mac", type: "MAC", re: /\b[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}\b/g },
  { name: "ipv6", type: "IP", re: /\b(?:[0-9A-Fa-f]{1,4}:){3,7}[0-9A-Fa-f]{1,4}\b|\b(?:[0-9A-Fa-f]{1,4}:){1,7}:(?::[0-9A-Fa-f]{1,4})+\b/g },
  { name: "ipv4", type: "IP", re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  {
    name: "fqdn",
    type: "HOST",
    re: new RegExp(`\\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${FQDN_TLDS})\\b`, "gi"),
  },
  {
    name: "user",
    type: "USER",
    re: /\b(user(?:name)?)(\s*[=:]\s*|\s+)(["']?)([A-Za-z][A-Za-z0-9._$-]{2,})\3/gi,
    group: 4,
    pick: (args) => {
      const sep = args[2] ?? "";
      const value = args[4] ?? "";
      if (/\s/.test(sep) && USER_STOPWORDS.has(value.toLowerCase())) return null;
      return value;
    },
  },
  { name: "asn", type: "ASN", re: /\bAS\d{1,10}\b/g },
];

export function anonymize(input: string): AnonResult {
  const a = new Allocator();
  let text = input;

  for (const rule of RULES) {
    text = text.replace(rule.re, (...args) => {
      const full = args[0] as string;
      if (rule.pick) {
        const value = rule.pick(args);
        if (value === null) return full;
        const ph = a.alloc(rule.type, value);
        return full.replace(value, ph);
      }
      if (rule.group != null) {
        const captured = args[rule.group] as string;
        const ph = a.alloc(rule.type, captured);
        return full.replace(captured, ph);
      }
      return a.alloc(rule.type, full);
    });
  }

  return { text, mapping: a.toJSON() };
}

/** Restore original values in a text that contains placeholders. */
export function deanonymize(text: string, mapping: Record<string, string>): string {
  let out = text;
  for (const [original, placeholder] of Object.entries(mapping)) {
    out = out.split(placeholder).join(original);
  }
  return out;
}
