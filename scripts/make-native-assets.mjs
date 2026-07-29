// Build the @capacitor/assets source images (icon + splash) from the flame SVG.
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/favicon.svg"));
const assets = join(root, "assets");
const BG = "#0c0e12";

// App icon: 1024², opaque (Apple applies its own mask). Flatten the SVG's
// dark rounded rect onto the same dark so corners disappear.
await sharp(svg).resize(1024, 1024).flatten({ background: BG }).png()
  .toFile(join(assets, "icon.png"));

// Splash: 2732², flame centered at ~26% on the dark background.
const flame = await sharp(svg).resize(710, 710).png().toBuffer();
await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } })
  .composite([{ input: flame, gravity: "center" }]).png()
  .toFile(join(assets, "splash.png"));
await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } })
  .composite([{ input: flame, gravity: "center" }]).png()
  .toFile(join(assets, "splash-dark.png"));

console.log("wrote assets/icon.png, splash.png, splash-dark.png");
