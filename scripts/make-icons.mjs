// Rasterize the flame SVG into the PWA + iOS icon set. Dev-time only.
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/favicon.svg"));
const out = join(root, "public");
mkdirSync(out, { recursive: true });

const jobs = [
  ["pwa-192.png", 192, false],
  ["pwa-512.png", 512, false],
  ["apple-touch-icon.png", 180, false],
  // Maskable: icon content shrunk into the safe zone on a solid background.
  ["pwa-maskable-512.png", 512, true],
];

for (const [name, size, maskable] of jobs) {
  if (maskable) {
    const inner = await sharp(svg).resize(Math.round(size * 0.72)).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: "#0c0e12" } })
      .composite([{ input: inner, gravity: "center" }])
      .png()
      .toFile(join(out, name));
  } else {
    await sharp(svg).resize(size).png().toFile(join(out, name));
  }
  console.log("wrote", name);
}
