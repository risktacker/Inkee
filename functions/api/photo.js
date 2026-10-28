// POST /api/photo  { image: "data:image/jpeg;base64,..." }
// Muse Spark looks at a photo, finds the main object and its parts, and returns
// where each part is (normalised boxes) plus a short narrated explanation.
// Inkee explains objects only; it never identifies people.
import { chat, json } from "./_shared.js";

const SYSTEM = `You are Inkee. Look at the photo and explain the main OBJECT in it so a curious beginner understands how it works.
Never identify, describe or guess anything about people. If the main subject is a person, or the photo shows medical symptoms, return {"refused": true, "reason": string}.
Return JSON only:
{"object": string (what it is, max 6 words),
 "parts": [{"name": string (max 4 words),
            "box": [x, y, w, h] (numbers 0-1, fraction of image width/height, tight around the part),
            "narration": string (1-2 spoken sentences on what this part does, max 35 words)}],
 "summary": string (1-2 spoken sentences on how the parts work together, max 45 words)}
Use 3 to 6 clearly visible parts. Order them so the explanation flows.`;

export async function onRequestPost({ request, env }) {
  try {
    const { image } = await request.json();
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
    const parts = (Array.isArray(out.parts) ? out.parts : []).slice(0, 6).filter(p =>
      Array.isArray(p.box) && p.box.length === 4 && p.box.every(n => typeof n === "number"));
    if (!parts.length) throw new Error("No parts found");
    return json({ object: String(out.object || "Object"), parts, summary: String(out.summary || "") });
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
}
