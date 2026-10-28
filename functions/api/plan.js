// POST /api/plan  { question }
// Muse Spark turns a question into a short lesson plan: 4-6 steps, each with a
// spoken narration and a description of the drawing for that step.
import { chat, json } from "./_shared.js";

const SYSTEM = `You are Inkee, a patient teacher who explains hard ideas with simple drawings.
Turn the learner's question into a short visual lesson.
Return JSON only:
{"title": string (max 8 words),
 "steps": [{"heading": string (max 6 words),
            "narration": string (1-2 plain spoken sentences, max 40 words, no jargon without explaining it),
            "drawing": string (what to draw for this step, concrete shapes and labels, max 40 words)}]}
Use 4 to 6 steps that build on each other, from the simplest idea to the answer.
Refuse medical diagnosis or treatment advice, anything political or about war, and anything identifying real people: return {"refused": true, "reason": string}.`;

export async function onRequestPost({ request, env }) {
  try {
    const { question } = await request.json();
    const q = String(question || "").trim().slice(0, 300);
    if (q.length < 3) return json({ error: "Ask a question first." }, 400);
    const plan = await chat(env, [
      { role: "system", content: SYSTEM },
      { role: "user", content: q },
    ], { maxTokens: 1500, effort: "low" });
    if (plan.refused) return json({ refused: true, reason: plan.reason || "Inkee can't explain that one." });
    const steps = Array.isArray(plan.steps) ? plan.steps.slice(0, 6) : [];
    if (!steps.length) throw new Error("Empty lesson plan");
    return json({ title: String(plan.title || q), steps });
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
}
