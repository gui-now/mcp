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
| expires | string | no | `1h`, `24h`, `7d`, `14d`, `30d` |
| password | string | no | Pro only: password-protect the canvas |

### create_markdown_canvas

Create a markdown canvas (rendered server-side).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| markdown | string | yes | Markdown content |
| title | string | no | Canvas title |
| theme | string | no | Theme |
| expires | string | no | `1h`, `24h`, `7d`, `14d`, `30d` |

### create_multi_frame

Create a multi-frame canvas with multiple HTML panels.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| frames | array | yes | `[{html: string, label?: string}]` |
| title | string | no | Canvas title |
| theme | string | no | Theme |
| expires | string | no | `1h`, `24h`, `7d`, `14d`, `30d` |

### create_diagram

Render a Mermaid diagram as a pannable, zoomable canvas.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mermaid | string | yes | Mermaid source, e.g. `graph TD\n  A --> B` |
| title | string | no | Canvas title |
| theme | string | no | Theme |
| expires | string | no | `1h`, `24h`, `7d`, `14d`, `30d` |

### update_canvas

Replace the content of an existing canvas. All viewers see the change immediately.
Free tier allows 3 edits per canvas; Pro is unlimited.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canvas_id | string | yes | The canvas id |
| edit_token | string | yes | Returned when the canvas was created — keep it |
| html | string | no | Replacement HTML |
| title | string | no | Replacement title |
| frames | array | no | Replacement frames |

### extend_canvas

Push a canvas's expiry out to 24 hours from now.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canvas_id | string | yes | The canvas id |

## Configuration

| Env Var | Description |
|---------|-------------|
| `GUI_NOW_API_KEY` | Pro API key for higher rate limits (100/hr vs 5/hr), longer expiry, and password protection |
| `GUI_NOW_URL` | Override the API base URL (defaults to `https://gui.now`) |

`GUI_NEW_API_KEY` and `GUI_NEW_URL` are the pre-rename names and are still read
as fallbacks, so keys exported before the move to gui.now keep working.

## License

MIT
