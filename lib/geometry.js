// Box helpers: Inkee stores every box as [x, y, w, h] in 0-1 fractions of the image.

export const clamp01 = n => Math.max(0, Math.min(1, Number(n) || 0));

export function isBox(b) {
  return Array.isArray(b) && b.length === 4 && b.every(n => typeof n === "number" && Number.isFinite(n));
}

/**
 * Convert a SAM pixel box to fractions of the image.
 * SAM reports corners in pixels; its w/h are the box size in some responses and the
 * image size in others, so the image size sent by the client is the trusted reference.
 */
export function samToFraction(b, imageWidth, imageHeight) {
  let W = Number(imageWidth), H = Number(imageHeight);
  if (!(W > 0 && H > 0)) {
    const wIsBoxSize = Math.abs(b.x2 - b.x1 - b.w) <= 2 && Math.abs(b.y2 - b.y1 - b.h) <= 2;
    if (wIsBoxSize) return null;
    W = b.w; H = b.h;
  }
  const box = [b.x1 / W, b.y1 / H, (b.x2 - b.x1) / W, (b.y2 - b.y1) / H].map(clamp01);
  return box[2] > 0.01 && box[3] > 0.01 ? box : null;
}
