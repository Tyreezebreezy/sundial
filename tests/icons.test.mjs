import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const root = new URL("../", import.meta.url);
test("Windows icon bundle has multi-resolution frames and shared installer identity", () => {
  const conf = JSON.parse(
    fs.readFileSync(new URL("src-tauri/tauri.conf.json", root)),
  );
  const ico = fs.readFileSync(new URL("src-tauri/icons/icon.ico", root));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  const sizes = [];
  for (let i = 0; i < ico.readUInt16LE(4); i++) {
    const o = 6 + 16 * i;
    const w = ico[o] || 256,
      h = ico[o + 1] || 256;
    assert.equal(w, h);
    sizes.push(w);
    assert.ok(ico.readUInt32LE(o + 12) + ico.readUInt32LE(o + 8) <= ico.length);
  }
  for (const size of [16, 24, 32, 48, 256])
    assert.ok(sizes.includes(size), "missing " + size + "px frame");
  assert.equal(conf.bundle.windows.nsis.installerIcon, "icons/icon.ico");
  assert.equal(conf.bundle.windows.nsis.uninstallerIcon, "icons/icon.ico");
  for (const [name, size] of [
    ["32x32.png", 32],
    ["128x128.png", 128],
    ["128x128@2x.png", 256],
    ["tray.png", 32],
  ]) {
    const png = fs.readFileSync(new URL("src-tauri/icons/" + name, root));
    assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});
