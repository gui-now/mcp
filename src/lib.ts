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
