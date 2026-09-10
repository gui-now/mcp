#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// GUI_NEW_URL / GUI_NEW_API_KEY are the pre-rename names; still honoured so
// existing setups keep working without the user having to re-export anything.
const BASE_URL = (process.env.GUI_NOW_URL ||
    process.env.GUI_NEW_URL ||
    "https://gui.now").replace(/\/$/, "");
const API_KEY = process.env.GUI_NOW_API_KEY || process.env.GUI_NEW_API_KEY;
async function request(method, path, body, extraHeaders = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...extraHeaders,
    };
    if (API_KEY) {
        headers["x-api-key"] = API_KEY;
    }
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
    return (await res.json());
}
async function callApi(body) {
    return request("POST", "/api/canvas", body);
}
function formatResult(data) {
    const lines = [
        `URL: ${data.url}`,
        `ID: ${data.id}`,
        `Format: ${data.format}`,
        `Expires: ${data.expires_at}`,
    ];
    // The edit token is the only way to call update_canvas later and the API
    // returns it exactly once, here. Omitting it from the tool result left the
    // client no way to obtain it, which made update_canvas unreachable.
    if (data.edit_token)
        lines.push(`Edit token: ${data.edit_token}`);
    if (data.pro)
        lines.push("Pro: yes");
    if (data.password_protected)
        lines.push("Password protected: yes");
    return lines.join("\n");
}
const server = new McpServer({
    name: "gui-now-mcp",
    version: "1.0.0",
});
server.tool("create_canvas", "Create an HTML canvas on gui.now and get a shareable URL", {
    html: z.string().describe("Raw HTML content for the canvas"),
    title: z.string().optional().describe("Optional title"),
    theme: z.string().optional().describe("Optional theme"),
    expires: z
        .enum(["1h", "24h", "7d", "14d", "30d"])
        .optional()
        .describe("Expiry duration (free users locked to 24h)"),
    password: z
        .string()
        .optional()
        .describe("Pro only: password-protect the canvas"),
}, async ({ html, title, theme, expires, password }) => {
    try {
        const body = { html };
        if (title)
            body.title = title;
        if (theme)
            body.theme = theme;
        if (expires)
            body.expires = expires;
        if (password)
            body.password = password;
        const data = await callApi(body);
        return { content: [{ type: "text", text: formatResult(data) }] };
    }
    catch (e) {
        return {
            content: [{ type: "text", text: `Error: ${e.message}` }],
            isError: true,
        };
    }
});
server.tool("create_markdown_canvas", "Create a markdown canvas on gui.now (rendered server-side) and get a shareable URL", {
    markdown: z.string().describe("Markdown content"),
    title: z.string().optional().describe("Optional title"),
    theme: z.string().optional().describe("Optional theme"),
    expires: z
        .enum(["1h", "24h", "7d", "14d", "30d"])
        .optional()
        .describe("Expiry duration (free users locked to 24h)"),
}, async ({ markdown, title, theme, expires }) => {
    try {
        const body = { markdown };
        if (title)
            body.title = title;
        if (theme)
            body.theme = theme;
        if (expires)
            body.expires = expires;
        const data = await callApi(body);
        return { content: [{ type: "text", text: formatResult(data) }] };
    }
    catch (e) {
        return {
            content: [{ type: "text", text: `Error: ${e.message}` }],
            isError: true,
        };
    }
});
server.tool("create_multi_frame", "Create a multi-frame canvas on gui.now with multiple HTML panels", {
    frames: z
        .array(z.object({
        html: z.string().describe("HTML content for this frame"),
        label: z.string().optional().describe("Optional label for this frame"),
    }))
        .min(1)
        .describe("Array of frames"),
    title: z.string().optional().describe("Optional title"),
    theme: z.string().optional().describe("Optional theme"),
    expires: z
        .enum(["1h", "24h", "7d", "14d", "30d"])
        .optional()
        .describe("Expiry duration (free users locked to 24h)"),
}, async ({ frames, title, theme, expires }) => {
    try {
        const body = { frames };
        if (title)
            body.title = title;
        if (theme)
            body.theme = theme;
        if (expires)
            body.expires = expires;
        const data = await callApi(body);
        return { content: [{ type: "text", text: formatResult(data) }] };
    }
    catch (e) {
        return {
            content: [{ type: "text", text: `Error: ${e.message}` }],
            isError: true,
        };
    }
});
server.tool("create_diagram", "Render a Mermaid diagram as a pannable, zoomable canvas on gui.now and get a shareable URL", {
    mermaid: z
        .string()
        .describe("Mermaid source, e.g. 'graph TD\\n  A[Start] --> B[End]'"),
    title: z.string().optional().describe("Optional title"),
    theme: z.string().optional().describe("Optional theme"),
    expires: z
        .enum(["1h", "24h", "7d", "14d", "30d"])
        .optional()
        .describe("Expiry duration (free users locked to 24h)"),
}, async ({ mermaid, title, theme, expires }) => {
    try {
        // /api/flow is a legacy alias that only proxies here, so post directly.
        const body = { mermaid };
        if (title)
            body.title = title;
        if (theme)
            body.theme = theme;
        if (expires)
            body.expires = expires;
        const data = await callApi(body);
        return { content: [{ type: "text", text: formatResult(data) }] };
    }
    catch (e) {
        return {
            content: [{ type: "text", text: `Error: ${e.message}` }],
            isError: true,
        };
    }
});
server.tool("update_canvas", "Replace the content of an existing gui.now canvas. Needs the edit_token returned when it was created. Free tier allows 3 edits per canvas; Pro is unlimited. All viewers see the change immediately.", {
    canvas_id: z.string().describe("The canvas id, e.g. 'abc123'"),
    edit_token: z
        .string()
        .describe("The edit_token returned when the canvas was created"),
    html: z.string().optional().describe("Replacement HTML"),
    title: z.string().optional().describe("Replacement title"),
    frames: z
        .array(z.object({
        html: z.string().describe("HTML content for this frame"),
        label: z.string().optional().describe("Optional label for this frame"),
    }))
        .optional()
        .describe("Replacement frames"),
}, async ({ canvas_id, edit_token, html, title, frames }) => {
    try {
        const body = {};
        if (html !== undefined)
            body.html = html;
        if (title !== undefined)
            body.title = title;
        if (frames !== undefined)
            body.frames = frames;
        if (Object.keys(body).length === 0) {
            throw new Error("Pass at least one of html, title or frames to change.");
        }
        const data = await request("PUT", `/api/canvas/${encodeURIComponent(canvas_id)}`, body, { Authorization: `Bearer ${edit_token}` });
        return {
            content: [
                { type: "text", text: `Updated ${canvas_id}\n${JSON.stringify(data, null, 2)}` },
            ],
        };
    }
    catch (e) {
        return {
            content: [{ type: "text", text: `Error: ${e.message}` }],
            isError: true,
        };
    }
});
server.tool("extend_canvas", "Push a gui.now canvas's expiry out to 24 hours from now, so a canvas that is about to lapse stays reachable", {
    canvas_id: z.string().describe("The canvas id, e.g. 'abc123'"),
}, async ({ canvas_id }) => {
    try {
        const data = await request("POST", `/api/canvas/${encodeURIComponent(canvas_id)}/extend`, {});
        return {
            content: [
                { type: "text", text: `Extended ${data.id}\nExpires: ${data.expires_at}` },
            ],
        };
    }
    catch (e) {
        return {
            content: [{ type: "text", text: `Error: ${e.message}` }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
