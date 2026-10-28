// POST /api/draw  { title, heading, drawing }
// Muse Spark draws one lesson step as clean SVG line art. The browser then
// animates each stroke so the picture appears like ink from a pen.
import { chat, json, DRAWING_RULES } from "./_shared.js";

const SYSTEM = `You are Inkee's illustrator. You draw simple, accurate teaching diagrams as SVG line art.
${DRAWING_RULES}
Return JSON only: {"svg": string}.`;

export async function onRequestPost({ request, env }) {
  try {
    const { title, heading, drawing } = await request.json();
    const brief = `Lesson: ${String(title || "").slice(0, 120)}
Step: ${String(heading || "").slice(0, 80)}
Draw: ${String(drawing || "").slice(0, 400)}`;
    const out = await chat(env, [
      { role: "system", content: SYSTEM },
      { role: "user", content: brief },
    ], { maxTokens: 3000, effort: "low" });
    const svg = String(out.svg || "");
    if (!svg.includes("<svg")) throw new Error("No drawing returned");
    return json({ svg });
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
}
