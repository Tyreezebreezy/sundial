// Chrome DevTools Protocol client for WebView2.
//
// A Tauri (or any WebView2) app is launched with
//   WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port>
// which exposes every window as a CDP "page" target. This module lists those
// targets and speaks CDP over the WebSocket each one offers. It needs Node 22+
// (global fetch and WebSocket) and nothing else.

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listTargets(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`);
  return (await res.json()).filter((t) => t.type === "page");
}

/** Poll until at least `min` page targets answer, or throw after `timeoutMs`. */
export async function waitForTargets(
  port,
  { min = 1, timeoutMs = 60_000 } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let last = "no answer from the debugging port";
  while (Date.now() < deadline) {
    try {
      const targets = await listTargets(port);
      if (targets.length >= min) return targets;
      last = `${targets.length} page target(s), wanted ${min}`;
    } catch (e) {
      last = e.message;
    }
    await sleep(1000);
  }
  throw new Error(
    `no WebView2 debugging endpoint on port ${port} (${last}). ` +
      `Start an isolated instance first: native/instance.ps1 -Action start-dev`,
  );
}

export class Session {
  constructor(ws, target) {
    this.ws = ws;
    this.target = target;
    this.nextId = 1;
    this.pending = new Map();
    this.exceptions = []; // uncaught page exceptions seen since the session opened
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, timer } = this.pending.get(msg.id);
        clearTimeout(timer);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === "Runtime.exceptionThrown") {
        const d = msg.params.exceptionDetails;
        this.exceptions.push(d.exception?.description ?? d.text);
      }
    });
  }

  static async open(target) {
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    const session = new Session(ws, target);
    await session.send("Runtime.enable");
    return session;
  }

  send(method, params = {}, timeoutMs = 60_000) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out after ${timeoutMs} ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression, awaitPromise = true) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise,
    });
    if (r.exceptionDetails) {
      throw new Error(
        "eval failed: " +
          JSON.stringify(
            r.exceptionDetails.exception?.description || r.exceptionDetails,
          ),
      );
    }
    return r.result.value;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* already closed */
    }
  }
}

/** The Tauri window label of a page, or null when the page is not a Tauri window. */
export function tauriLabel(session) {
  return session.eval(
    `(() => window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? null)()`,
  );
}
