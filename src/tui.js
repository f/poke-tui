import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { EventEmitter } from "node:events";

export const tuiEvents = new EventEmitter();

const h = React.createElement;
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const THINKING_WORDS = [
  "Poking around", "Checking my notes", "Asking the palm tree",
  "Surfing the waves", "On it", "Digging in", "Cooking up a reply",
  "Reaching out to the universe", "Looking into it", "Brewing thoughts",
  "Catching a vibe", "Consulting the coconuts", "Adventuring",
  "Figuring it out", "Putting it together", "Almost there",
  "Exploring options", "Connecting the dots", "Reading the vibes",
  "One sec", "Hang tight", "Working on it", "Crunching it",
  "Fetching an answer", "Assembling words", "Crafting a reply",
  "Poking the clouds", "Channeling island energy", "Sipping and thinking",
  "Vibing with it", "Letting it marinate", "Piecing it together",
];

function pickWord() {
  return THINKING_WORDS[Math.floor(Math.random() * THINKING_WORDS.length)];
}

function Banner({ userName }) {
  return h(Box, { flexDirection: "column", paddingX: 1, marginBottom: 1 },
    h(Text, null),
    h(Text, { bold: true, color: "#7B68EE" }, "  🌴 Poke"),
    h(Text, { dimColor: true }, "  your AI assistant in the terminal"),
    h(Text, { dimColor: true }, "  by Interaction Company of California"),
    h(Text, null),
    userName
      ? h(Text, null, `  Welcome back, ${userName}!`)
      : null,
    h(Text, { dimColor: true }, "  Type a message to chat · /help for commands"),
  );
}

function ThinkingIndicator() {
  const [frame, setFrame] = useState(0);
  const [word, setWord] = useState(pickWord);

  useEffect(() => {
    const spin = setInterval(() => setFrame((f) => (f + 1) % SPINNER.length), 80);
    const swap = setInterval(() => setWord(pickWord()), 3000);
    return () => { clearInterval(spin); clearInterval(swap); };
  }, []);

  return h(Box, { paddingX: 1 },
    h(Text, { color: "#7B68EE" }, `${SPINNER[frame]} `),
    h(Text, { dimColor: true }, `${word}…`),
  );
}

function Message({ role, text }) {
  if (role === "you") {
    return h(Box, { paddingX: 1, marginTop: 1 },
      h(Text, { bold: true }, "❯ "),
      h(Text, null, text),
    );
  }
  if (role === "poke") {
    return h(Box, { paddingX: 1, flexDirection: "column" },
      h(Text, { color: "#7B68EE", bold: true }, "poke"),
      h(Box, { paddingLeft: 2 }, h(Text, null, text)),
    );
  }
  if (role === "error") {
    return h(Box, { paddingX: 1 },
      h(Text, { color: "red" }, `✗ ${text}`),
    );
  }
  return h(Box, { paddingX: 1 }, h(Text, { dimColor: true }, text));
}

function App() {
  const { exit } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [userName, setUserName] = useState(null);
  const idRef = useRef(0);

  const nextId = useCallback(() => `msg-${++idRef.current}`, []);

  const push = useCallback((role, text) => {
    setMessages((prev) => [...prev.slice(-100), { role, text, id: nextId() }]);
  }, [nextId]);

  useEffect(() => {
    const onMsg = (role, text) => {
      push(role, text);
      if (role === "you") setThinking(true);
      if (role === "poke" || role === "error") setThinking(false);
    };
    const onSys = (text) => push("system", text);
    const onErr = (text) => { push("error", text); setThinking(false); };
    const onConn = (v) => setConnected(v);
    const onThink = (v) => setThinking(v);
    const onQuit = () => exit();
    const onUser = (name) => setUserName(name);

    tuiEvents.on("message", onMsg);
    tuiEvents.on("system", onSys);
    tuiEvents.on("error", onErr);
    tuiEvents.on("connected", onConn);
    tuiEvents.on("thinking", onThink);
    tuiEvents.on("quit", onQuit);
    tuiEvents.on("user-name", onUser);

    return () => {
      tuiEvents.off("message", onMsg);
      tuiEvents.off("system", onSys);
      tuiEvents.off("error", onErr);
      tuiEvents.off("connected", onConn);
      tuiEvents.off("thinking", onThink);
      tuiEvents.off("quit", onQuit);
      tuiEvents.off("user-name", onUser);
    };
  }, [push, exit]);

  useInput((ch, key) => {
    if (key.ctrl && ch === "c") {
      tuiEvents.emit("user-quit");
      exit();
    }
  });

  const handleSubmit = (value) => {
    if (!value.trim()) return;
    setInput("");
    tuiEvents.emit("user-input", value.trim());
  };

  const visible = messages.slice(-50);
  const cols = process.stdout.columns || 80;

  return h(Box, { flexDirection: "column", width: "100%" },

    h(Banner, { userName }),

    h(Box, { flexDirection: "column", flexGrow: 1 },
      ...visible.map((msg) =>
        h(Message, { key: msg.id, role: msg.role, text: msg.text })
      ),
      thinking && h(ThinkingIndicator, { key: "thinking" }),
    ),

    h(Box, { paddingX: 1 },
      h(Text, { dimColor: true }, "─".repeat(cols - 2)),
    ),
    h(Box, { paddingX: 1 },
      h(Text, { color: "#7B68EE", bold: true }, "❯ "),
      h(TextInput, { value: input, onChange: setInput, onSubmit: handleSubmit, placeholder: "Ask Poke anything…" }),
    ),
    h(Box, { paddingX: 1, justifyContent: "space-between" },
      h(Text, { dimColor: true },
        h(Text, { color: connected ? "green" : "yellow" }, connected ? "● " : "○ "),
        connected ? "connected" : "connecting",
      ),
      h(Text, { dimColor: true }, "esc interrupt · /help · ctrl-c quit"),
    ),
  );
}

export function startTUI() {
  process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
  return render(h(App));
}
