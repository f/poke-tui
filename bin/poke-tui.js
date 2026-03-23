#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const CONFIG_DIR = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
const PUI_CONFIG = join(CONFIG_DIR, "poke-tui", "config.json");

function loadConfig() {
  try {
    return JSON.parse(readFileSync(PUI_CONFIG, "utf-8"));
  } catch {
    return {};
  }
}

function saveConfig(config) {
  mkdirSync(join(CONFIG_DIR, "poke-tui"), { recursive: true });
  writeFileSync(PUI_CONFIG, JSON.stringify(config, null, 2));
}

function resolveToken() {
  if (process.env.POKE_API_KEY) return process.env.POKE_API_KEY;

  const config = loadConfig();
  if (config.apiKey) return config.apiKey;

  return null;
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function onboarding() {
  console.log();
  console.log("  🌴 Welcome to Poke TUI");
  console.log();
  console.log("  To get started, you need a Poke API key.");
  console.log();
  console.log("  1. Go to https://poke.com/kitchen/api-keys");
  console.log("  2. Generate a new key (starts with pk_)");
  console.log("  3. Paste it below");
  console.log();

  const key = await ask("  API key: ");

  if (!key || !key.startsWith("pk_")) {
    console.log();
    console.log("  That doesn't look like a valid API key (should start with pk_).");
    console.log("  You can also set it later:");
    console.log();
    console.log("    export POKE_API_KEY=pk_your_key_here");
    console.log();
    process.exit(1);
  }

  saveConfig({ apiKey: key });

  console.log();
  console.log("  Saved! Starting Poke TUI...");
  console.log();

  return key;
}

async function main() {
  let token = resolveToken();

  if (!token) {
    token = await onboarding();
  }

  process.env.POKE_API_KEY = token;

  await import("../src/app.js");
}

main();
