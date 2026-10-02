export interface PatternEntry {
  id: number;
  title: string;
  pattern: string;
  pattern_type: "exact" | "regex";
  vendor_id: number | null;
}

export interface MatchLine {
  n: number;
  text: string;
}

export interface MatchGroup {
  entry: PatternEntry;
  lines: MatchLine[];
}

const MAX_LINES_PER_ERROR = 4;

/**
 * Match a pasted log against the Error KB patterns.
 * If vendorFilter is set, multi-vendor entries (vendor_id null) and that
 * vendor's entries are eligible; otherwise every entry is eligible.
 */
export function findMatches(log: string, entries: PatternEntry[], vendorFilter?: number | null): MatchGroup[] {
  if (!log.trim()) return [];
  const lines = log.split(/\r?\n/);
  const groups: MatchGroup[] = [];

  for (const entry of entries) {
    if (vendorFilter != null && entry.vendor_id != null && entry.vendor_id !== vendorFilter) continue;

    let test: (s: string) => boolean;
    if (entry.pattern_type === "regex") {
      let re: RegExp;
      try {
        re = new RegExp(entry.pattern, "i");
      } catch {
        continue;
      }
      test = (s) => re.test(s);
    } else {
      const needle = entry.pattern.toLowerCase();
      if (!needle) continue;
      test = (s) => s.toLowerCase().includes(needle);
    }

    const hit: MatchLine[] = [];
    for (let i = 0; i < lines.length && hit.length < MAX_LINES_PER_ERROR; i++) {
      if (test(lines[i])) hit.push({ n: i + 1, text: lines[i].slice(0, 400) });
    }
    if (hit.length > 0) groups.push({ entry, lines: hit });
  }

  return groups;
}

/** Detect vendor heuristically from log content. Returns slug or null. */
export function guessVendorSlug(log: string): string | null {
  const l = log.toLowerCase();
  const rules: [string, RegExp][] = [
    ["fortigate", /fortigate|fgt_|sslvpn_|ike \d+(:\d+)?[: ]|fortios|diag vpn/i],
    ["paloalto", /palo alto|globalprotect|pan-os|\(type: \w+,subtype:|datalake|panorama/i],
    ["checkpoint", /checkpoint|smartview|cpkernel|fw1|vpn debug|iked: |elg/i],
    ["juniper", /junos|%DAEMON|iked|kmd|st0\.|show security ike|vmx|srx|mx240|ex4300|qfx/i],
    ["cisco", /%LINK-3-|%SYS-%|%CRYPTO-|%BGP-|%OSPF-|%SPANTREE-|cisco|iosd|nexus|asa/],
  ];
  for (const [slug, re] of rules) {
    if (re.test(l) || re.test(log)) return slug;
  }
  return null;
}
