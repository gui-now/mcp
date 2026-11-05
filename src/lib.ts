// Pure helpers for the MCP server, kept separate from the stdio wiring so they
// can be tested without starting a server.

export interface CanvasResponse {
  id: string;
  url: string;
  edit_token: string;
  /** null when the page never expires (Pro by default). */
  expires_at: string | null;
  expires_clamped?: boolean;
  /** Pages made without an account or Pro key: a one-time link for a person. */
  claim_url?: string;
  owned?: boolean;
  pro: boolean;
  format: string;
  password_protected?: boolean;
  /** Fingerprint of what the page serves ("sha256:<hex>"). */
  content_hash?: string;
}

export interface UpdateResponse {
  id: string;
  updated: boolean;
  /** Fields this update changed, e.g. ["html", "title"]. */
  changed: string[];
  /** Fields in the request the API didn't apply. */
  ignored?: string[];
  format?: string;
  content_hash: string;
  edit_count?: number;
  edits_remaining?: number;
}

export interface UpdateInput {
  html?: string;
  markdown?: string;
  mermaid?: string;
  theme?: string;
  title?: string;
  frames?: { html: string; label?: string }[];
}

export interface ExtendResponse {
  id: string;
  expires_at: string | null;
  extended?: boolean;
  expires_clamped?: boolean;
}

/** "30m" | "24h" | "7d" (up to 6 digits) or "never"; the API caps at 365d. */
export const EXPIRES_PATTERN = /^(?:[1-9]\d{0,5}[mhd]|never)$/;

export const EXPIRES_DESCRIPTION =
  "How long until the page expires, e.g. '1h', '24h', '7d', or 'never'. " +
  "Defaults: 24h without an account, never with a Pro key. Without an account " +
  "the longest is 72h; longer requests are clamped, not rejected.";

// Identifies this client so the page owner's library can show "MCP" as the
// source. A label only; the API never uses it for auth or billing.
export const CLIENT = "gui-now-mcp";

export function buildHeaders(opts: {
  apiKey?: string;
  agent?: string;
  extra?: Record<string, string>;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-gui-client": CLIENT,
  };
  // MCP clientInfo.name, e.g. "claude-code"; the API maps it to "Claude Code".
  if (opts.agent) headers["x-gui-agent"] = opts.agent.slice(0, 64);
  if (opts.apiKey) headers["x-api-key"] = opts.apiKey;
  return { ...headers, ...opts.extra };
}

export function formatExpiry(expiresAt: string | null | undefined): string {
  return expiresAt ? expiresAt : "never";
}

export function formatResult(data: CanvasResponse): string {
  const lines = [
    `URL: ${data.url}`,
    `ID: ${data.id}`,
    `Format: ${data.format}`,
    `Expires: ${formatExpiry(data.expires_at)}`,
  ];
  if (data.expires_clamped) {
    lines.push("Note: the requested expiry was longer than allowed, so it was shortened to the maximum.");
  }
  // The edit token is the only way to call update_canvas later and the API
  // returns it exactly once, here. Omitting it from the tool result left the
  // client no way to obtain it, which made update_canvas unreachable.
  if (data.edit_token) lines.push(`Edit token: ${data.edit_token}`);
  if (data.content_hash) lines.push(`Content hash: ${data.content_hash}`);
  if (data.pro) lines.push("Pro: yes");
  if (data.password_protected) lines.push("Password protected: yes");
  if (data.claim_url) {
    lines.push(
      `Claim link: ${data.claim_url}`,
      "Share the claim link with the user: opening it lets them sign in to gui.now and keep this page in their library past its expiry. It works once."
    );
  }
  return lines.join("\n");
}

export function formatExtend(data: ExtendResponse): string {
  const lines = [`Extended ${data.id}`, `Expires: ${formatExpiry(data.expires_at)}`];
  if (data.expires_clamped) {
    lines.push("Note: shortened to the longest expiry this page allows.");
  }
  return lines.join("\n");
}

/** Body for POST /extend: only send expires when the caller asked for one. */
export function extendBody(expires?: string): Record<string, unknown> {
  return expires ? { expires } : {};
}

/**
 * Body for PUT /api/canvas/<id>. Only fields the caller set are sent, so the
 * page keeps its password and expiry. Throws on input the API would reject
 * with a 400, so the agent gets the reason without a round trip.
 */
export function updateBody(input: UpdateInput): Record<string, unknown> {
  const sources = (["html", "markdown", "mermaid"] as const).filter((k) => input[k] !== undefined);
  if (sources.length > 1) {
    throw new Error(`Send one of html, markdown or mermaid per update, not ${sources.join(" and ")}.`);
  }
  const body: Record<string, unknown> = {};
  for (const k of ["html", "markdown", "mermaid", "title", "frames"] as const) {
    if (input[k] !== undefined) body[k] = input[k];
  }
  if (Object.keys(body).length === 0) {
    throw new Error("Pass at least one of html, markdown, mermaid, title or frames to change.");
  }
  if (input.theme && (input.markdown !== undefined || input.mermaid !== undefined)) body.theme = input.theme;
  return body;
}

export function formatUpdate(data: UpdateResponse): string {
  const lines = [
    `Updated ${data.id}`,
    `Changed: ${data.changed.length ? data.changed.join(", ") : "nothing (the page already had this content)"}`,
  ];
  if (data.format) lines.push(`Format: ${data.format}`);
  lines.push(
    `Content hash: ${data.content_hash}`,
    `To confirm what's live, compare it with the X-Content-Hash header on /embed/${data.id}.`
  );
  if (data.ignored?.length) {
    lines.push(`Ignored: ${data.ignored.join(", ")} (to change when the page expires, use extend_canvas)`);
  }
  if (typeof data.edits_remaining === "number") lines.push(`Edits left: ${data.edits_remaining}`);
  return lines.join("\n");
}
