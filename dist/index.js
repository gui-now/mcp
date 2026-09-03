#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const API_BASE = "https://gui.now/api/canvas";
const API_KEY = process.env.GUI_NOW_API_KEY || process.env.GUI_NEW_API_KEY;
async function callApi(body) {
    const headers = {
        "Content-Type": "application/json",
    };
    if (API_KEY) {
        headers["x-api-key"] = API_KEY;
    }
    const res = await fetch(API_BASE, {
        method: "POST",
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
function formatResult(data) {
    const lines = [
        `URL: ${data.url}`,
        `ID: ${data.id}`,
        `Format: ${data.format}`,
        `Expires: ${data.expires_at}`,
    ];
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
}, async ({ html, title, theme, expires }) => {
    try {
        const body = { html };
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
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
