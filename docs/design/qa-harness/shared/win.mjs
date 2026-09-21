// One app window (a CDP page) with the helpers scenarios actually need:
// real pointer and keyboard input, IPC calls, screenshots, viewport and media
// emulation, and page-side probes.
import fs from "node:fs";
import path from "node:path";
import { sleep } from "./cdp.mjs";
import {
  centerProbe,
  clickTextProbe,
  setValueProbe,
  textProbe,
} from "./probes.mjs";

const KEYS = {
  Tab: { key: "Tab", code: "Tab", vk: 9 },
  Enter: { key: "Enter", code: "Enter", vk: 13, text: "\r" },
  Escape: { key: "Escape", code: "Escape", vk: 27 },
  Space: { key: " ", code: "Space", vk: 32, text: " " },
  Backspace: { key: "Backspace", code: "Backspace", vk: 8 },
  Delete: { key: "Delete", code: "Delete", vk: 46 },
  Home: { key: "Home", code: "Home", vk: 36 },
  End: { key: "End", code: "End", vk: 35 },
  PageUp: { key: "PageUp", code: "PageUp", vk: 33 },
  PageDown: { key: "PageDown", code: "PageDown", vk: 34 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", vk: 37 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", vk: 38 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", vk: 39 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", vk: 40 },
};

export class Win {
  constructor(session, role, label) {
    this.session = session;
    this.role = role;
    this.label = label;
  }

  send(method, params) {
    return this.session.send(method, params);
  }

  eval(expression, awaitPromise = true) {
    return this.session.eval(expression, awaitPromise);
  }

  get exceptions() {
    return this.session.exceptions;
  }

  /** Run a self-contained function inside the page and return its (JSON) result. */
  probe(fn, arg = null) {
    return this.session.eval(`(${fn.toString()})(${JSON.stringify(arg)})`);
  }

  /** Call an IPC command through the real bridge (Tauri). Resolves to the parsed result. */
  async invoke(cmd, args = {}) {
    const json = await this.session.eval(
      `window.__TAURI_INTERNALS__.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(args)}).then(v => JSON.stringify(v ?? null))`,
    );
    return JSON.parse(json);
  }

  // ---- reading the page --------------------------------------------------------
  text(selector) {
    return this.probe(textProbe, selector);
  }

  /** Evaluate `expr` with the first match bound to `e`; null when nothing matches. */
  $(selector, expr = "e") {
    return this.session.eval(
      `(() => { const e = document.querySelector(${JSON.stringify(selector)}); return e ? (${expr}) : null })()`,
    );
  }

  count(selector) {
    return this.session.eval(
      `document.querySelectorAll(${JSON.stringify(selector)}).length`,
    );
  }

  async waitFor(selector, timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if ((await this.count(selector)) > 0) return true;
      await sleep(100);
    }
    return false;
  }

  // ---- input -------------------------------------------------------------------
  /** Programmatic click on the control whose text or aria-label matches. */
  click(text, selector = "button, [role=tab], label") {
    return this.probe(clickTextProbe, { text, selector });
  }

  /** A real pointer click (move, press, release) at the centre of `selector`. */
  async pointerClick(selector, settleMs = 250) {
    const c = await this.probe(centerProbe, selector);
    if (!c) return false;
    await this.hover(c.x, c.y);
    const base = { x: c.x, y: c.y, button: "left", clickCount: 1 };
    await this.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      ...base,
    });
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      ...base,
    });
    await sleep(settleMs);
    return true;
  }

  /** Real synthetic mouse move: drives :hover. Use (-20, -20) to move the pointer away. */
  hover(x, y) {
    return this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  }

  /** A key press (keyDown + keyUp). Names: Tab Enter Escape Space Arrow* Home End ... */
  async key(name, { shift = false, ctrl = false, alt = false } = {}) {
    const k = KEYS[name] ?? KEYS[name === " " ? "Space" : name];
    if (!k) throw new Error(`unknown key "${name}"`);
    const modifiers = (alt ? 1 : 0) | (ctrl ? 2 : 0) | (shift ? 8 : 0);
    const common = {
      key: k.key,
      code: k.code,
      windowsVirtualKeyCode: k.vk,
      nativeVirtualKeyCode: k.vk,
      modifiers,
    };
    // Enter/Space activate native buttons only when the event carries text.
    await this.send("Input.dispatchKeyEvent", {
      type: k.text ? "keyDown" : "rawKeyDown",
      ...common,
      ...(k.text ? { text: k.text } : {}),
    });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...common });
  }

  /** Set an input/select value the way frameworks notice. */
  setValue(selector, value) {
    return this.probe(setValueProbe, { selector, value });
  }

  // ---- page and emulation --------------------------------------------------------
  async reload(waitMs = 1700) {
    await this.session.eval(`location.reload(); 'r'`);
    await sleep(waitMs);
  }

  viewport(width, height, dpr = 1) {
    return this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: dpr,
      mobile: false,
    });
  }

  clearViewport() {
    return this.send("Emulation.clearDeviceMetricsOverride");
  }

  /** Force the page background (widgets are transparent windows). null clears it. */
  backdrop(color) {
    return this.send(
      "Emulation.setDefaultBackgroundColorOverride",
      color ? { color } : {},
    );
  }

  /** e.g. media([{ name: "prefers-reduced-motion", value: "reduce" }]); [] clears. */
  media(features) {
    return this.send("Emulation.setEmulatedMedia", { features });
  }

  /**
   * Capture a PNG. With { width, height, dpr } the viewport is emulated for the
   * shot and restored afterwards; { bg } forces a page background for the shot.
   */
  async shot(file, { width, height, dpr = 1, bg, settleMs = 250 } = {}) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (width && height) {
      await this.viewport(width, height, dpr);
      await sleep(settleMs);
    }
    if (bg) {
      await this.backdrop(bg);
      await sleep(60);
    }
    const r = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    if (bg) await this.backdrop(null);
    if (width && height) await this.clearViewport();
    return file;
  }

  /** The accessibility tree, as CDP reports it. */
  async axTree() {
    await this.send("Accessibility.enable");
    return (await this.send("Accessibility.getFullAXTree")).nodes;
  }

  performanceMetrics() {
    return this.send("Performance.enable").then(async () =>
      Object.fromEntries(
        (await this.send("Performance.getMetrics")).metrics.map((m) => [
          m.name,
          m.value,
        ]),
      ),
    );
  }
}
