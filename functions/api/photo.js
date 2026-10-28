// POST /api/photo { image, width, height } -> { object, parts: [{ name, narration, box, source }], summary }
// 1. Muse Spark reads the photo, names the object's parts and narrates each one.
// 2. SAM 3.1 locates every part from its name, in parallel. Spark's rough box is the fallback.
// Inkee explains objects only and never identifies people.
import { chatJson, segment } from "../../lib/meta.js";
import { PHOTO } from "../../lib/prompts.js";
import { clamp01, isBox, samToFraction } from "../../lib/geometry.js";
import { HttpError, readJson, route } from "../../lib/http.js";

const IMAGE = /^data:image\/(png|jpe?g|webp);base64,/;

async function locate(env, image, part, width, height) {
  const phrase = String(part.find || part.name || "").slice(0, 40);
  if (phrase) {
    try {
      const [best] = await segment(env, image, phrase);
      const box = best && samToFraction(best, width, height);
      if (box) return { box, source: "sam-3.1" };
    } catch { /* fall back to Muse Spark's estimate */ }
  }
  return isBox(part.box) ? { box: part.box.map(clamp01), source: "muse-spark" } : null;
}

export const onRequestPost = route(async ({ request, env }) => {
  const { image, width, height } = await readJson(request, 6_000_000);
  if (!IMAGE.test(String(image || ""))) throw new HttpError(400, "Send a PNG, JPEG or WebP photo.");

  const out = await chatJson(env, [
    { role: "system", content: PHOTO },
    { role: "user", content: [
      { type: "text", text: "Explain the main object in this photo." },
      { type: "image_url", image_url: { url: image } },
    ] },
  ], { maxTokens: 1500 });
  if (out.refused) return { refused: true, reason: out.reason || "Inkee only explains objects." };

  const parts = (Array.isArray(out.parts) ? out.parts : []).slice(0, 6);
  if (!parts.length) throw new Error("Inkee couldn't find any parts in that photo.");

  const located = await Promise.all(parts.map(async p => {
    const where = await locate(env, image, p, width, height);
    return where && {
      name: String(p.name || p.find || "").slice(0, 60),
      narration: String(p.narration || "").slice(0, 400),
      ...where,
    };
  }));
  const found = located.filter(Boolean);
  if (!found.length) throw new Error("Inkee couldn't locate the parts in that photo.");
  return { object: String(out.object || "Object").slice(0, 80), parts: found, summary: String(out.summary || "").slice(0, 500) };
});
