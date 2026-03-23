import { createMcpServer, startMcpHttpServer, mcpEvents } from "./mcp-server.js";
import { PokeClient } from "./poke-client.js";
import { TUI } from "./tui.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

function resolveToken() {
  if (process.env.POKE_API_KEY) return process.env.POKE_API_KEY;

  const configDir = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  const credPath = join(configDir, "poke", "credentials.json");

  try {
    const creds = JSON.parse(readFileSync(credPath, "utf-8"));
    if (creds.token) return creds.token;
  } catch {}

  return null;
}

const POKE_API_KEY = resolveToken();

if (!POKE_API_KEY) {
  console.error(
    "No Poke credentials found.\n\n" +
      "Either:\n" +
      "  1. Run: npx poke login\n" +
      "  2. Or set: export POKE_API_KEY=pk_your_key_here\n\n" +
      "Get an API key at https://poke.com/kitchen/api-keys"
  );
  process.exit(1);
}

const tui = new TUI();
const client = new PokeClient({
  apiKey: POKE_API_KEY,
  onEvent: (type, data) => {
    switch (type) {
      case "tunnel-connected":
        tui.setConnected(true);
        break;
      case "tunnel-disconnected":
        tui.setConnected(false);
        tui.addSystem("Connection lost. Reconnecting…");
        break;
      case "tunnel-error":
        tui.addError(`Connection error: ${data}`);
        break;
      case "tools-synced":
        break;
      case "error":
        tui.addError(data);
        break;
    }
  },
});

mcpEvents.on("reply", (text) => {
  tui.addMessage("poke", text);
});

mcpEvents.on("notification", (message) => {
  tui.addSystem(message);
});

async function handleInput(text) {
  if (text.startsWith("/")) {
    await handleCommand(text);
    return;
  }

  tui.addMessage("you", text);

  try {
    const res = await client.sendMessage(text);
    if (res.success === false) {
      tui.addError(res.message || "Failed to send message.");
    }
  } catch (err) {
    tui.addError(err.message);
  }
}

async function handleCommand(text) {
  const parts = text.slice(1).split(" ");
  const cmd = parts[0]?.toLowerCase();

  if (cmd === "help") {
    tui.addSystem("Commands:");
    tui.addSystem("  /webhook create <when> | <do what>");
    tui.addSystem("  /webhook fire <#> {\"data\":\"here\"}");
    tui.addSystem("  /webhooks");
    tui.addSystem("  /status");
    tui.addSystem("  /clear");
    return;
  }

  if (cmd === "clear") {
    tui.chatLog.setContent("");
    tui.screen.render();
    return;
  }

  if (cmd === "status") {
    tui.addSystem(tui.connected ? "Connected and ready." : "Connecting…");
    tui.addSystem(`Webhooks: ${client.webhooks.length}`);
    return;
  }

  if (cmd === "webhooks") {
    if (client.webhooks.length === 0) {
      tui.addSystem("No webhooks yet. Create one with /webhook create");
      return;
    }
    client.webhooks.forEach((wh, i) => {
      tui.addSystem(`  #${i}  ${wh.triggerId}`);
    });
    return;
  }

  if (cmd === "webhook") {
    const sub = parts[1]?.toLowerCase();

    if (sub === "create") {
      const rest = parts.slice(2).join(" ");
      const pipeIdx = rest.indexOf("|");
      if (pipeIdx === -1) {
        tui.addError("Usage: /webhook create <when> | <do what>");
        return;
      }
      const condition = rest.slice(0, pipeIdx).trim();
      const action = rest.slice(pipeIdx + 1).trim();

      try {
        const wh = await client.createWebhook({ condition, action });
        tui.addSystem(`Webhook #${client.webhooks.length - 1} created.`);
      } catch (err) {
        tui.addError(err.message);
      }
      return;
    }

    if (sub === "fire") {
      const index = parseInt(parts[2], 10);
      const jsonStr = parts.slice(3).join(" ");
      if (isNaN(index) || !jsonStr) {
        tui.addError("Usage: /webhook fire <#> {\"data\":\"here\"}");
        return;
      }
      let data;
      try {
        data = JSON.parse(jsonStr);
      } catch {
        tui.addError("Invalid JSON.");
        return;
      }
      try {
        await client.fireWebhook(index, data);
        tui.addSystem("Webhook fired.");
      } catch (err) {
        tui.addError(err.message);
      }
      return;
    }

    tui.addError("Try: /webhook create or /webhook fire");
    return;
  }

  tui.addError(`Unknown command. Type /help`);
}

async function main() {
  tui.init();
  tui.onSend = handleInput;
  tui.onQuit = shutdown;

  try {
    createMcpServer();
    const { port } = await startMcpHttpServer();
    await client.init(port);
    await client.startTunnel(port);
  } catch (err) {
    tui.addError(err.message);
    tui.addSystem("Replies will arrive on your phone instead.");
  }
}

async function shutdown() {
  try { await client.stop(); } catch {}
  tui.destroy();
  process.exit(0);
}

process.on("uncaughtException", (err) => {
  tui?.addError?.(err.message) ?? console.error(err);
});

process.on("unhandledRejection", (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  tui?.addError?.(msg) ?? console.error(err);
});

main();
