# gui-new-mcp

MCP server for [gui.new](https://gui.new) — instant HTML canvas sharing.

Create shareable HTML canvases, markdown pages, and multi-frame presentations from any MCP client.

## Installation

```bash
npm install -g gui-new-mcp
```

Or run directly:

```bash
npx gui-new-mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gui-new": {
      "command": "npx",
      "args": ["-y", "gui-new-mcp"],
      "env": {
        "GUI_NEW_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add gui-new -- npx -y gui-new-mcp
```

With a Pro API key:

```bash
claude mcp add gui-new -e GUI_NEW_API_KEY=your-key -- npx -y gui-new-mcp
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

## Configuration

| Env Var | Description |
|---------|-------------|
| `GUI_NEW_API_KEY` | Pro API key for higher rate limits (100/hr vs 5/hr), longer expiry, and password protection |

## License

MIT
