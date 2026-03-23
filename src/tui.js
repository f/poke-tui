import blessed from "blessed";

export class TUI {
  constructor() {
    this.screen = null;
    this.chatLog = null;
    this.input = null;
    this.statusBar = null;
    this.onSend = null;
    this.connected = false;
    this.waitingForReply = false;
  }

  init() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "Poke",
      fullUnicode: true,
    });

    this.chatLog = blessed.log({
      parent: this.screen,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%-4",
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: " " },
      mouse: true,
      keys: true,
      vi: true,
      tags: true,
      padding: { left: 1, right: 1 },
    });

    const inputWrapper = blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 0,
      width: "100%",
      height: 3,
      style: { bg: "black" },
    });

    blessed.box({
      parent: inputWrapper,
      top: 0,
      left: 0,
      width: "100%",
      height: 1,
      content: "─".repeat(200),
      style: { fg: "gray" },
    });

    blessed.text({
      parent: inputWrapper,
      left: 1,
      top: 1,
      content: ">",
      style: { fg: "white" },
    });

    this.input = blessed.textbox({
      parent: inputWrapper,
      top: 1,
      left: 3,
      right: 1,
      height: 1,
      inputOnFocus: true,
      keys: true,
      mouse: true,
    });

    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: "100%",
      height: 1,
      tags: true,
      style: { fg: "gray" },
      padding: { left: 1 },
    });

    this.updateStatus();

    this.input.on("submit", (value) => {
      if (value.trim()) this.onSend?.(value.trim());
      this.input.clearValue();
      this.input.focus();
      this.screen.render();
    });

    this.input.on("cancel", () => {
      this.input.clearValue();
      this.screen.render();
    });

    this.screen.key(["escape"], () => {
      this.input.clearValue();
      this.input.focus();
      this.screen.render();
    });

    this.input.key(["C-c"], () => this.onQuit?.());
    this.screen.key(["C-c"], () => this.onQuit?.());

    this.input.focus();
    this.screen.render();
  }

  addMessage(role, text) {
    const wrapped = this.wrap(text);
    if (role === "you") {
      this.chatLog.log(`you: ${wrapped}`);
      this.waitingForReply = true;
      this.updateStatus();
    } else if (role === "poke") {
      this.chatLog.log(`poke: ${wrapped}`);
      this.waitingForReply = false;
      this.updateStatus();
    }
    this.screen.render();
  }

  addSystem(text) {
    this.chatLog.log(`{gray-fg}${this.esc(text)}{/}`);
    this.screen.render();
  }

  addError(text) {
    this.chatLog.log(`error: ${this.esc(text)}`);
    this.screen.render();
  }

  setConnected(value) {
    this.connected = value;
    this.updateStatus();
  }

  updateStatus() {
    if (!this.statusBar) return;
    const state = this.connected ? "connected" : "connecting...";
    const thinking = this.waitingForReply ? "  |  thinking..." : "";
    this.statusBar.setContent(`{gray-fg}${state}${thinking}  |  ctrl-c quit  |  /help{/}`);
    this.screen?.render();
  }

  wrap(text) {
    return String(text).replace(/\{/g, "\\{").replace(/\}/g, "\\}");
  }

  esc(text) {
    return String(text).replace(/\{/g, "\\{").replace(/\}/g, "\\}");
  }

  destroy() {
    this.screen?.destroy();
  }
}
