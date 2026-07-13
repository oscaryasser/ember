import { photoAdd, photoAll, photoDel } from "./idb.js";

// Downscale + re-encode to JPEG before storing: keeps IndexedDB small and
// guarantees the stored blob renders everywhere (HEIC originals wouldn't).
// If decoding fails we store the original blob rather than losing the photo.
const MAX_EDGE = 1600;

async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob || file;
  } catch {
    return file;
  }
}

export async function savePhoto(file, date) {
  const blob = await shrink(file);
  return photoAdd({ date, blob, created: Date.now() });
}

export async function listPhotos() {
  const all = await photoAll();
  return all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
}

export const deletePhoto = photoDel;
