#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  buildHeaders,
  CanvasResponse,
  EXPIRES_DESCRIPTION,
  EXPIRES_PATTERN,
  ExtendResponse,
  extendBody,
  formatExtend,
  formatResult,
  formatUpdate,
  updateBody,
  type UpdateResponse,
} from "./lib.js";

// GUI_NEW_URL / GUI_NEW_API_KEY are the pre-rename names; still honoured so
// existing setups keep working without the user having to re-export anything.
const BASE_URL = (
  process.env.GUI_NOW_URL ||
  process.env.GUI_NEW_URL ||
  "https://gui.now"
).replace(/\/$/, "");
const API_KEY = process.env.GUI_NOW_API_KEY || process.env.GUI_NEW_API_KEY;

async function request<T>(
  method: string,
  path: string,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  const headers = buildHeaders({
    apiKey: API_KEY,
    agent: server.server.getClientVersion()?.name,
    extra: extraHeaders,
  });

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After") || "unknown";
    throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error (${res.status}): ${text}`);
  }

  return (await res.json()) as T;
}

async function callApi(body: Record<string, unknown>): Promise<CanvasResponse> {
  return request<CanvasResponse>("POST", "/api/canvas", body);
}

const expiresSchema = z
  .string()
  .regex(EXPIRES_PATTERN, "Use a duration like '24h' or '7d', or 'never'")
  .optional()
  .describe(EXPIRES_DESCRIPTION);

const server = new McpServer({
  name: "gui-now-mcp",
  version: "1.0.0",
});

server.tool(
  "create_canvas",
  "Create an HTML canvas on gui.now and get a shareable URL",
  {
    html: z.string().describe("Raw HTML content for the canvas"),
    title: z.string().optional().describe("Optional title"),
    theme: z.string().optional().describe("Optional theme"),
    expires: expiresSchema,
    password: z
      .string()
      .optional()
      .describe("Pro only: password-protect the canvas"),
  },
  async ({ html, title, theme, expires, password }) => {
    try {
      const body: Record<string, unknown> = { html };
      if (title) body.title = title;
      if (theme) body.theme = theme;
      if (expires) body.expires = expires;
      if (password) body.password = password;

      const data = await callApi(body);
      return { content: [{ type: "text", text: formatResult(data) }] };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "create_markdown_canvas",
  "Create a markdown canvas on gui.now (rendered server-side) and get a shareable URL",
  {
    markdown: z.string().describe("Markdown content"),
    title: z.string().optional().describe("Optional title"),
    theme: z.string().optional().describe("Optional theme"),
    expires: expiresSchema,
  },
  async ({ markdown, title, theme, expires }) => {
    try {
      const body: Record<string, unknown> = { markdown };
      if (title) body.title = title;
      if (theme) body.theme = theme;
      if (expires) body.expires = expires;

      const data = await callApi(body);
      return { content: [{ type: "text", text: formatResult(data) }] };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "create_multi_frame",
  "Create a multi-frame canvas on gui.now with multiple HTML panels",
  {
    frames: z
      .array(
        z.object({
          html: z.string().describe("HTML content for this frame"),
          label: z.string().optional().describe("Optional label for this frame"),
        })
      )
      .min(1)
      .describe("Array of frames"),
    title: z.string().optional().describe("Optional title"),
    theme: z.string().optional().describe("Optional theme"),
    expires: expiresSchema,
  },
  async ({ frames, title, theme, expires }) => {
    try {
      const body: Record<string, unknown> = { frames };
      if (title) body.title = title;
      if (theme) body.theme = theme;
      if (expires) body.expires = expires;

      const data = await callApi(body);
      return { content: [{ type: "text", text: formatResult(data) }] };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "create_diagram",
  "Render a Mermaid diagram as a pannable, zoomable canvas on gui.now and get a shareable URL",
  {
    mermaid: z
      .string()
      .describe("Mermaid source, e.g. 'graph TD\\n  A[Start] --> B[End]'"),
    title: z.string().optional().describe("Optional title"),
    theme: z.string().optional().describe("Optional theme"),
    expires: expiresSchema,
  },
  async ({ mermaid, title, theme, expires }) => {
    try {
      // /api/flow is a legacy alias that only proxies here, so post directly.
      const body: Record<string, unknown> = { mermaid };
      if (title) body.title = title;
      if (theme) body.theme = theme;
      if (expires) body.expires = expires;

      const data = await callApi(body);
      return { content: [{ type: "text", text: formatResult(data) }] };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "update_canvas",
  "Replace the content of an existing gui.now canvas. Needs the edit_token returned when it was created. Send one of html, markdown or mermaid to replace the body; anything you leave out, including the password and expiry, stays as it is. Returns what changed and a content hash. Free tier allows 3 edits per canvas; Pro is unlimited. All viewers see the change immediately.",
  {
    canvas_id: z.string().describe("The canvas id, e.g. 'abc123'"),
    edit_token: z
      .string()
      .describe("The edit_token returned when the canvas was created"),
    html: z.string().optional().describe("Replacement HTML"),
    markdown: z.string().optional().describe("Replacement Markdown, rendered server-side like create_markdown_canvas"),
    mermaid: z.string().optional().describe("Replacement Mermaid diagram source"),
    theme: z
      .enum(["dark", "light"])
      .optional()
      .describe("Theme for markdown or mermaid. Leave it out to follow the viewer's setting."),
    title: z.string().optional().describe("Replacement title"),
    frames: z
      .array(
        z.object({
          html: z.string().describe("HTML content for this frame"),
          label: z.string().optional().describe("Optional label for this frame"),
        })
      )
      .optional()
      .describe("Replacement frames"),
  },
  async ({ canvas_id, edit_token, html, markdown, mermaid, theme, title, frames }) => {
    try {
      const body = updateBody({ html, markdown, mermaid, theme, title, frames });
      const data = await request<UpdateResponse>(
        "PUT",
        `/api/canvas/${encodeURIComponent(canvas_id)}`,
        body,
        { Authorization: `Bearer ${edit_token}` }
      );
      return {
        content: [{ type: "text", text: formatUpdate(data) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "extend_canvas",
  "Push a gui.now canvas's expiry forward so it stays reachable. Without an edit token: +24h, and pages without an account stop at 72h after they were made. With the edit_token you can ask for a specific expiry (e.g. '72h', or 'never' with a Pro key), clamped to what the page allows. Pages in someone's library need the edit token.",
  {
    canvas_id: z.string().describe("The canvas id, e.g. 'abc123'"),
    edit_token: z
      .string()
      .optional()
      .describe("The edit_token returned when the canvas was created"),
    expires: expiresSchema.describe(
      "New expiry measured from now, e.g. '72h' or 'never'. Needs edit_token."
    ),
  },
  async ({ canvas_id, edit_token, expires }) => {
    try {
      if (expires && !edit_token) {
        throw new Error("Pass edit_token to choose an expiry; without it extend adds 24h.");
      }
      const data = await request<ExtendResponse>(
        "POST",
        `/api/canvas/${encodeURIComponent(canvas_id)}/extend`,
        extendBody(expires),
        edit_token ? { Authorization: `Bearer ${edit_token}` } : {}
      );
      return { content: [{ type: "text", text: formatExtend(data) }] };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
