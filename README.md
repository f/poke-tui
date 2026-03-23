# 🌴 pui

A terminal UI for [Poke](https://poke.com) — chat with your AI assistant without leaving the terminal.

Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs) and the [Poke SDK](https://www.npmjs.com/package/poke).

## Quick start

```bash
npx pui
```

On first run, you'll be guided through a one-time setup to paste your API key.

## How it works

**pui** connects to your Poke agent through the Poke API. You type messages in the terminal, and Poke responds inline — no need to switch to iMessage, Telegram, or SMS.

Behind the scenes, pui runs a local [MCP](https://modelcontextprotocol.io) server and tunnels it to Poke's cloud using `PokeTunnel`. This gives the agent a `reply_to_terminal` tool it can call to send responses directly back to your terminal.

```mermaid
flowchart TD
    A["You type a message"] --> B["Poke API (sendMessage)"]
    B --> C["Poke Agent processes it"]
    C --> D["Agent calls reply_to_terminal"]
    D --> E["MCP Tunnel (WebSocket)"]
    E --> F["Response in your terminal"]
```

## Setup

### Option 1: API key (recommended)

1. Go to [poke.com/kitchen/api-keys](https://poke.com/kitchen/api-keys)
2. Generate a new key (starts with `pk_`)
3. Run `npx pui` and paste it when prompted

The key is saved to `~/.config/pui/config.json` for future sessions.

### Option 2: Environment variable

```bash
export POKE_API_KEY=pk_your_key_here
npx pui
```

pui checks credentials in this order: `POKE_API_KEY` env var → `~/.config/pui/config.json`.

## Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/status` | Show connection status |
| `/webhook create <when> \| <do what>` | Create a webhook trigger |
| `/webhook fire <#> {"data":"here"}` | Fire a webhook with JSON data |
| `/webhooks` | List active webhooks |
| `/clear` | Clear the chat |

## Webhooks

Create automated triggers that fire your Poke agent with data:

```
/webhook create When a deploy fails | Summarize the error and suggest a fix
/webhook fire 0 {"repo":"my-app","error":"OOM killed","status":"failed"}
```

## Key bindings

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Ctrl-C` | Quit |
| `Esc` | Clear input |

## Requirements

- Node.js 18+
- A [Poke](https://poke.com) account with an API key

## How the MCP tunnel works

pui starts a lightweight HTTP server locally that implements the [Model Context Protocol](https://modelcontextprotocol.io) (MCP). It exposes two tools:

- **`reply_to_terminal`** — the agent calls this to send its response to your terminal
- **`notify_terminal`** — for short notifications

The server is tunneled to Poke's cloud via `PokeTunnel` (WebSocket-based). When the agent processes your message, it calls the tool, and the response flows back through the tunnel into your terminal.

## Configuration

Config is stored at `~/.config/pui/config.json`:

```json
{
  "apiKey": "pk_your_key_here"
}
```

To reset, delete the file and run `npx pui` again.

## Project structure

```
bin/
  pui.js            Entry point (npx bin), onboarding flow
src/
  app.js            Wires MCP server, Poke client, and TUI together
  mcp-server.js     Local MCP server (raw JSON-RPC over HTTP)
  poke-client.js    Poke SDK + PokeTunnel wrapper
  tui.js            Ink (React) terminal UI
```

## Credits

- [Poke](https://poke.com) by [The Interaction Company of California](https://interaction.co)
- [Ink](https://github.com/vadimdemedes/ink) by Vadim Demedes
- [Poke SDK](https://www.npmjs.com/package/poke)

## License

MIT
