# gui-now-mcp

MCP server for [GUI](https://gui.now) — instant HTML canvas sharing.

Create shareable HTML canvases, markdown pages, and multi-frame presentations from any MCP client.

## Installation

```bash
npm install -g gui-now-mcp
```

Or run directly:

```bash
npx gui-now-mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gui-now": {
      "command": "npx",
      "args": ["-y", "gui-now-mcp"],
      "env": {
        "GUI_NOW_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add gui-now -- npx -y gui-now-mcp
```

With a Pro API key:

```bash
claude mcp add gui-now -e GUI_NOW_API_KEY=your-key -- npx -y gui-now-mcp
```

## Tools

### create_canvas

Create an HTML canvas and get a shareable URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| html | string | yes | Raw HTML content |
| title | string | no | Canvas title |
| theme | string | no | Theme |
| expires | string | no | e.g. `1h`, `24h`, `7d`, or `never`. See [Expiry](#expiry) |
| password | string | no | Pro only: password-protect the canvas |

### create_markdown_canvas

Create a markdown canvas (rendered server-side).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| markdown | string | yes | Markdown content |
| title | string | no | Canvas title |
| theme | string | no | Theme |
| expires | string | no | e.g. `1h`, `24h`, `7d`, or `never`. See [Expiry](#expiry) |

### create_multi_frame

Create a multi-frame canvas with multiple HTML panels.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| frames | array | yes | `[{html: string, label?: string}]` |
| title | string | no | Canvas title |
| theme | string | no | Theme |
| expires | string | no | e.g. `1h`, `24h`, `7d`, or `never`. See [Expiry](#expiry) |

### create_diagram

Render a Mermaid diagram as a pannable, zoomable canvas.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mermaid | string | yes | Mermaid source, e.g. `graph TD\n  A --> B` |
| title | string | no | Canvas title |
| theme | string | no | Theme |
| expires | string | no | e.g. `1h`, `24h`, `7d`, or `never`. See [Expiry](#expiry) |

### update_canvas

Replace the content of an existing canvas. All viewers see the change immediately.
Send one of `html`, `markdown` or `mermaid` to replace the body; anything you
leave out, including the password and expiry, stays as it is. The result lists
what changed and the page's content hash, the same value `/embed/<id>` sends as
`X-Content-Hash`. Free tier allows 3 edits per canvas; Pro is unlimited.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canvas_id | string | yes | The canvas id |
| edit_token | string | yes | Returned when the canvas was created — keep it |
| html | string | no | Replacement HTML |
| markdown | string | no | Replacement Markdown, rendered server-side |
| mermaid | string | no | Replacement Mermaid diagram |
| theme | `dark` or `light` | no | For markdown or mermaid; leave out to follow the viewer |
| title | string | no | Replacement title |
| frames | array | no | Replacement frames |

### extend_canvas

Push a canvas's expiry forward. Without an edit token it adds 24 hours, and
pages without an account stop at 72 hours after they were made. With the edit
token you can ask for a specific expiry, clamped to what the page allows. Pages
in someone's library need the edit token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canvas_id | string | yes | The canvas id |
| edit_token | string | no | Returned when the canvas was created |
| expires | string | no | New expiry from now, e.g. `72h` or `never`. Needs `edit_token` |

## Expiry

| Publishing as | Default | Longest |
|---|---|---|
| No account, no key | 24h | 72h |
| Signed-in free account | 72h | 7d |
| Pro key (`GUI_NOW_API_KEY`) | never | no limit |

Asking for more than allowed isn't an error: the page gets the longest allowed
expiry and the tool result says it was shortened.

## Claim links

Pages made without a Pro key come back with a **claim link**. The tool result
asks the agent to share it with the user: opening it lets them sign in to
gui.now and keep the page in their library. It works once.

## Attribution

Requests carry `x-gui-client: gui-now-mcp` and the MCP client's name (for
example `claude-code`) as `x-gui-agent`, so the owner's library can show which
agent made each page. These are labels only, never used for auth or billing.

## Configuration

| Env Var | Description |
|---------|-------------|
| `GUI_NOW_API_KEY` | Pro API key for higher rate limits (100/hr vs 5/hr), longer expiry, and password protection |
| `GUI_NOW_URL` | Override the API base URL (defaults to `https://gui.now`) |

`GUI_NEW_API_KEY` and `GUI_NEW_URL` are the pre-rename names and are still read
as fallbacks, so keys exported before the move to gui.now keep working.

## License

MIT
