// POST /api/draw { title, heading, drawing } -> { svg }
// Muse Spark draws one lesson step as SVG line art; the browser inks it in stroke by stroke.
import { chatJson } from "../../lib/meta.js";
import { DRAW } from "../../lib/prompts.js";
import { readJson, route } from "../../lib/http.js";

export const onRequestPost = route(async ({ request, env }) => {
  const { title, heading, drawing } = await readJson(request);
  const brief = [
    `Lesson: ${String(title || "").slice(0, 120)}`,
    `Step: ${String(heading || "").slice(0, 80)}`,
    `Draw: ${String(drawing || "").slice(0, 400)}`,
  ].join("\n");

  const out = await chatJson(env, [
    { role: "system", content: DRAW },
    { role: "user", content: brief },
  ], { maxTokens: 3000 });

  const svg = String(out.svg || "");
  if (!svg.includes("<svg")) throw new Error("No drawing came back for this step.");
  return { svg };
});
