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
    frames?: {
        html: string;
        label?: string;
    }[];
}
export interface ExtendResponse {
    id: string;
    expires_at: string | null;
    extended?: boolean;
    expires_clamped?: boolean;
}
/** "30m" | "24h" | "7d" (up to 6 digits) or "never"; the API caps at 365d. */
export declare const EXPIRES_PATTERN: RegExp;
export declare const EXPIRES_DESCRIPTION: string;
export declare const CLIENT = "gui-now-mcp";
export declare function buildHeaders(opts: {
    apiKey?: string;
    agent?: string;
    extra?: Record<string, string>;
}): Record<string, string>;
export declare function formatExpiry(expiresAt: string | null | undefined): string;
export declare function formatResult(data: CanvasResponse): string;
export declare function formatExtend(data: ExtendResponse): string;
/** Body for POST /extend: only send expires when the caller asked for one. */
export declare function extendBody(expires?: string): Record<string, unknown>;
/**
 * Body for PUT /api/canvas/<id>. Only fields the caller set are sent, so the
 * page keeps its password and expiry. Throws on input the API would reject
 * with a 400, so the agent gets the reason without a round trip.
 */
export declare function updateBody(input: UpdateInput): Record<string, unknown>;
export declare function formatUpdate(data: UpdateResponse): string;
