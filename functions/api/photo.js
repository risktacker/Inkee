// POST /api/photo  { image: "data:image/jpeg;base64,...", width, height }
// 1. Muse Spark looks at the photo, names the main object and its parts, and
//    writes a short narration for each (plus a rough box as a fallback).
// 2. SAM 3.1 then finds each part precisely from its name, in parallel.
// Inkee explains objects only; it never identifies people.
import { chat, json, segment } from "./_shared.js";

const SYSTEM = `You are Inkee. Look at the photo and explain the main OBJECT in it so a curious beginner understands how it works.
Never identify, describe or guess anything about people. If the main subject is a person, or the photo shows medical symptoms, return {"refused": true, "reason": string}.
Return JSON only:
{"object": string (what it is, max 6 words),
 "parts": [{"name": string (max 4 words, as shown on a label),
            "find": string (1-3 word plain noun phrase a vision model can search for, e.g. "chain", "rear gear"),
            "box": [x, y, w, h] (numbers 0-1, fraction of image width/height, tight around the part),
            "narration": string (1-2 spoken sentences on what this part does, max 35 words)}],
 "summary": string (1-2 spoken sentences on how the parts work together, max 45 words)}
Use 3 to 6 clearly visible parts. Order them so the explanation flows.`;

const clamp = n => Math.max(0, Math.min(1, n));

function toNormalized(b, W, H) {
  // SAM returns pixel corners. Its w/h are either the box size or the image size;
  // the image size we sent is the reliable reference.
  if (!W || !H) {
    const boxSized = Math.abs(b.x2 - b.x1 - b.w) <= 2 && Math.abs(b.y2 - b.y1 - b.h) <= 2;
    if (boxSized) return null;
    W = b.w; H = b.h;
  }
  return [clamp(b.x1 / W), clamp(b.y1 / H), clamp((b.x2 - b.x1) / W), clamp((b.y2 - b.y1) / H)];
}

export async function onRequestPost({ request, env }) {
  try {
    const { image, width, height } = await request.json();
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(String(image || ""))) {
      return json({ error: "Send a PNG, JPEG or WebP photo." }, 400);
    }
    if (image.length > 6_000_000) return json({ error: "That photo is too large. Try a smaller one." }, 413);

    const out = await chat(env, [
      { role: "system", content: SYSTEM },
      { role: "user", content: [
        { type: "text", text: "Explain the main object in this photo." },
        { type: "image_url", image_url: { url: image } },
      ] },
    ], { maxTokens: 1500, effort: "low" });
    if (out.refused) return json({ refused: true, reason: out.reason || "Inkee only explains objects." });

    const parts = (Array.isArray(out.parts) ? out.parts : []).slice(0, 6);
    if (!parts.length) throw new Error("No parts found");

    // SAM 3.1: locate every part precisely, all at once.
    const located = await Promise.all(parts.map(async p => {
      const phrase = String(p.find || p.name || "").slice(0, 40);
      let box = null, source = "spark";
      try {
        const hits = phrase ? await segment(env, image, phrase) : [];
        if (hits.length) {
          const n = toNormalized(hits.sort((a, b) => a.ord - b.ord)[0], Number(width), Number(height));
          if (n && n[2] > 0.01 && n[3] > 0.01) { box = n; source = "sam"; }
        }
      } catch {}
      if (!box && Array.isArray(p.box) && p.box.length === 4 && p.box.every(n => typeof n === "number")) box = p.box.map(clamp);
      return box ? { name: String(p.name || phrase), narration: String(p.narration || ""), box, source } : null;
    }));

    const kept = located.filter(Boolean);
    if (!kept.length) throw new Error("Couldn't locate any parts");
    return json({ object: String(out.object || "Object"), parts: kept, summary: String(out.summary || "") });
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
}
