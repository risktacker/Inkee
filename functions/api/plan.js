// POST /api/plan { question } -> { title, steps: [{ heading, narration, drawing }] }
// Muse Spark turns a question into a 4-6 step visual lesson.
import { chatJson } from "../../lib/meta.js";
import { PLAN } from "../../lib/prompts.js";
import { HttpError, readJson, route } from "../../lib/http.js";

export const onRequestPost = route(async ({ request, env }) => {
  const { question } = await readJson(request);
  const q = String(question || "").trim().slice(0, 300);
  if (q.length < 3) throw new HttpError(400, "Ask a question first.");

  const plan = await chatJson(env, [
    { role: "system", content: PLAN },
    { role: "user", content: q },
  ], { maxTokens: 1500 });

  if (plan.refused) return { refused: true, reason: plan.reason || "Inkee can't explain that one." };
  const steps = (Array.isArray(plan.steps) ? plan.steps : []).slice(0, 6).map(s => ({
    heading: String(s.heading || "").slice(0, 80),
    narration: String(s.narration || "").slice(0, 400),
    drawing: String(s.drawing || "").slice(0, 400),
  }));
  if (!steps.length) throw new Error("The lesson plan came back empty. Try again.");
  return { title: String(plan.title || q).slice(0, 120), steps };
});
