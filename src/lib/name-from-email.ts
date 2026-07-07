const ALIASES = new Set([
  "info",
  "ip",
  "no-reply",
  "noreply",
  "admin",
  "contact",
  "hello",
  "team",
  "support",
  "sales",
  "help",
  "office",
]);

function cap(s: string): string {
  if (!s) return s;
  if (s.length === 1) return s.toUpperCase() + ".";
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

export function guessNameFromEmail(email: string): string {
  const trimmed = (email || "").trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at < 1) return "";
  const localRaw = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const local = localRaw.split("+")[0];

  const domainRoot = domain.split(".")[0] || domain;

  if (ALIASES.has(local)) {
    return cap(domainRoot);
  }

  const tokens = local.split(/[._-]+/).filter(Boolean);
  if (tokens.length === 0) return cap(local);
  if (tokens.length === 1) {
    const t = tokens[0];
    // "sreyes" -> "Sreyes" (single token, keep as-is capitalized)
    return t[0].toUpperCase() + t.slice(1);
  }
  return tokens.map(cap).join(" ");
}