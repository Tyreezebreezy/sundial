// Uses the project's existing Tauri CLI and an already-installed Sharp.
// node generate-icons.mjs <path-to-tauri.js> <path-to-sharp-module>
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require(process.argv[3] || "sharp");
const tauriCli = resolve(
  process.argv[2] || "node_modules/@tauri-apps/cli/tauri.js",
);
const assets = join(root, "assets");
const previews = join(root, "previews");
await mkdir(assets, { recursive: true });
await mkdir(previews, { recursive: true });

// Tauri owns the platform encoders. Only desktop assets enter the integration set.
execFileSync(
  process.execPath,
  [
    tauriCli,
    "icon",
    join(root, "sundial-master.svg"),
    "--output",
    join(root, "generated"),
  ],
  { stdio: "inherit" },
);

const desktopNames = [
  "icon.png",
  "icon.ico",
  "icon.icns",
  "32x32.png",
  "128x128.png",
  "128x128@2x.png",
  "Square30x30Logo.png",
  "Square44x44Logo.png",
  "Square71x71Logo.png",
  "Square89x89Logo.png",
  "Square107x107Logo.png",
  "Square142x142Logo.png",
  "Square150x150Logo.png",
  "Square284x284Logo.png",
  "Square310x310Logo.png",
  "StoreLogo.png",
];
for (const name of desktopNames) {
  await copyFile(join(root, "generated", name), join(assets, name));
}
await copyFile(join(root, "sundial-master.svg"), join(assets, "sundial.svg"));
await copyFile(join(root, "sundial-tray.svg"), join(assets, "tray.svg"));
const sizes = [16, 24, 32, 48, 256];
for (const size of sizes) {
  await sharp(join(root, "sundial-master.svg"))
    .resize(size, size)
    .png()
    .toFile(join(previews, `app-${size}.png`));
  await sharp(join(root, "sundial-tray.svg"))
    .resize(size, size)
    .png()
    .toFile(join(previews, `tray-${size}.png`));
}
await copyFile(join(previews, "tray-32.png"), join(assets, "tray.png"));
await copyFile(join(previews, "tray-16.png"), join(assets, "tray-16.png"));
await copyFile(join(previews, "tray-24.png"), join(assets, "tray-24.png"));
await copyFile(join(previews, "tray-48.png"), join(assets, "tray-48.png"));

const iconSource = await readFile(join(root, "Icon.tsx"), "utf8");
const controls = [
  ...iconSource.matchAll(/^  ([a-z]+):([\s\S]*?)(?=^  [a-z]+:|^} satisfies)/gm),
].map(([, name, shape]) => ({
  name,
  shape: shape
    .trim()
    .replace(/,$/, "")
    .replace(/^\(\s*/, "")
    .replace(/\s*\)$/, "")
    .replace(/<>|<\/>/g, ""),
}));
assert.deepEqual(
  controls.map(({ name }) => name),
  [
    "sliders",
    "close",
    "pause",
    "play",
    "skip",
    "more",
    "power",
    "open",
    "chevron",
    "back",
    "plus",
    "reset",
    "expand",
  ],
  "All existing semantic icon names must remain available.",
);

const svgImage = async (file, x, y, size) =>
  `<image x="${x}" y="${y}" width="${size}" height="${size}"
    href="data:image/png;base64,${(await readFile(file)).toString("base64")}"/>`;
let sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="860">
  <style>text{font-family:Segoe UI,Arial,sans-serif;font-size:14px;fill:#a9a49a}
  .title{font-size:24px;fill:#f1ede4}.small{font-size:12px}</style>
  <rect width="1100" height="860" fill="#10100f"/>
  <text x="32" y="42" class="title">SUNDIAL · light, gnomon, shadow</text>
  <text x="32" y="69">Original vector master · app / window / installer · simplified tray derivative</text>
  <rect x="32" y="98" width="1036" height="292" rx="12" fill="#171715"/>
  <rect x="32" y="410" width="1036" height="196" rx="12" fill="#e9e6df"/>
  <text x="48" y="124">APP · native sizes</text>
  <text x="48" y="436" fill="#292824">TRAY · native sizes on light desktop</text>`;
for (const [i, size] of sizes.entries()) {
  const x = i === 4 ? 782 : 80 + i * 154;
  sheet += await svgImage(join(previews, `app-${size}.png`), x, 150, size);
  sheet += `<text x="${x}" y="${size === 256 ? 378 : 218}">${size}px</text>`;
  if (size < 256) {
    sheet += await svgImage(join(previews, `tray-${size}.png`), x, 460, size);
    sheet += `<text x="${x}" y="548" style="fill:#514d44">${size}px</text>`;
  }
}
sheet += await svgImage(join(previews, "tray-256.png"), 822, 426, 164);
sheet += `<text x="48" y="259">16 / 24 / 32px at 3× · optical inspection</text>`;
for (const [i, size] of [16, 24, 32].entries()) {
  const enlarged = await sharp(join(previews, `app-${size}.png`))
    .resize(size * 3, size * 3, { kernel: "nearest" })
    .png()
    .toBuffer();
  sheet += `<image x="${80 + i * 154}" y="279" width="${size * 3}" height="${size * 3}"
    href="data:image/png;base64,${enlarged.toString("base64")}"/>`;
}
sheet += `<text x="32" y="648" class="title">SUNDIAL controls · one optical grid</text>
  <text x="32" y="675">20px grid / 1.5px round stroke · familiar actions, consistent proportions</text>`;
for (const [i, { name, shape }] of controls.entries()) {
  const x = 52 + i * 78;
  sheet += `<svg x="${x}" y="708" width="24" height="24" viewBox="0 0 20 20"
    fill="none" stroke="#f1ede4" stroke-width="1.5" stroke-linecap="round"
    stroke-linejoin="round">${shape}</svg>
    <svg x="${x + 4}" y="758" width="16" height="16" viewBox="0 0 20 20"
    fill="none" stroke="#d5a84c" stroke-width="1.5" stroke-linecap="round"
    stroke-linejoin="round">${shape}</svg>
    <text x="${x + 12}" y="811" text-anchor="middle" class="small">${name}</text>`;
}
sheet += "</svg>";
await writeFile(join(previews, "contact-sheet.svg"), sheet);
await sharp(Buffer.from(sheet))
  .png()
  .toFile(join(previews, "contact-sheet.png"));

const checks = [];
for (const family of ["app", "tray"]) {
  for (const size of sizes) {
    const file = join(previews, `${family}-${size}.png`);
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.width, size);
    assert.equal(info.height, size);
    assert.equal(info.channels, 4);
    assert.equal(data[3], 0, "Outer corner must remain transparent.");
    const center = (Math.floor(size / 2) * size + Math.floor(size / 2)) * 4;
    assert.equal(data[center + 3], 255, "Center must be opaque.");
    assert.ok(
      data.some((v, i) => i % 4 === 0 && v > 200),
      "Gold/light detail must survive.",
    );
    checks.push(
      `${family}-${size}: dimensions, transparency, opaque center, light detail PASS`,
    );
  }
}
const ico = await readFile(join(assets, "icon.ico"));
assert.equal(ico.readUInt16LE(0), 0);
assert.equal(ico.readUInt16LE(2), 1);
const icoSizes = [];
for (let i = 0; i < ico.readUInt16LE(4); i++) {
  const p = 6 + i * 16;
  const width = ico[p] || 256;
  const height = ico[p + 1] || 256;
  assert.equal(width, height);
  assert.ok(ico.readUInt32LE(p + 12) + ico.readUInt32LE(p + 8) <= ico.length);
  icoSizes.push(width);
}
for (const size of [16, 32, 48, 256]) assert.ok(icoSizes.includes(size));
checks.push(`ICO directory and bounds PASS: ${icoSizes.join(", ")}`);
const manifest = {};
for (const name of [
  ...desktopNames,
  "tray.png",
  "tray-16.png",
  "tray-24.png",
  "tray-48.png",
]) {
  const buffer = await readFile(join(assets, name));
  manifest[name] = {
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}
await writeFile(
  join(root, "verification.json"),
  JSON.stringify(
    {
      result: "PASS",
      checks,
      controls: controls.map(({ name }) => name),
      assets: manifest,
      limitations: [
        "No installed Windows shell or taskbar icon-cache verification.",
        "No native tray DPI selection verification.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `PASS: ${checks.length} asset checks; ${controls.length} preserved controls.`,
);
