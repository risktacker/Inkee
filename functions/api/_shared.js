// Shared helpers for Inkee's Pages Functions.
// All model calls go through Meta Model API (OpenAI-compatible chat completions).

export const META_BASE = "https://api.meta.ai/v1";
export const MODEL = "muse-spark-1.3";

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function chat(env, messages, { maxTokens = 2000, effort = "low" } = {}) {
  const key = env.MODEL_API_KEY;
  if (!key) throw new Error("MODEL_API_KEY is not set");
  const base = { model: env.META_MODEL || MODEL, messages, max_tokens: maxTokens };
  const send = body => fetch(`${env.META_API_BASE || META_BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  let res = await send({ ...base, reasoning_effort: effort, response_format: { type: "json_object" } });
  // If the optional fields are rejected, retry with the plain request.
  if (res.status === 400) res = await send(base);
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 400);
    throw new Error(`Meta API ${res.status}: ${detail}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return parseJson(text);
}

// SAM 3.1 through the Responses API: a short noun phrase + an image in,
// boxes out as text like 1<|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..|>
const BOX = /(\d+)<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)\|>/g;
export async function segment(env, image, phrase) {
  const res = await fetch(`${env.META_API_BASE || META_BASE}/responses`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.MODEL_API_KEY}` },
    body: JSON.stringify({
      model: env.SAM_MODEL || "sam-3.1",
      input: [{ role: "user", content: [
        { type: "input_text", text: phrase },
        { type: "input_image", image_url: image },
      ] }],
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  let text = data.output_text || "";
  if (!text && Array.isArray(data.output)) {
    text = data.output.flatMap(o => (o.content || []).map(c => c.text || "")).join("\n");
  }
  return [...text.matchAll(BOX)].map(m => {
    const [, ord, x1, y1, x2, y2, w, h] = m.map(Number);
    return { ord, x1, y1, x2, y2, w, h };
  });
}

export function parseJson(text) {
  const t = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error("Model did not return JSON");
}

export const DRAWING_RULES = `Drawing rules for every SVG:
- Return one complete <svg> element with viewBox="0 0 400 300" and nothing else around it.
- Line art only, like a teacher drawing with one pen on a whiteboard: use <path>, <line>, <circle>, <ellipse>, <rect>, <polyline>, <polygon>.
- Every shape: fill="none", stroke="currentColor", stroke-width between 2 and 4, stroke-linecap="round", stroke-linejoin="round".
- At most 3 short text labels using <text> with font-size between 12 and 16 and fill="currentColor". Keep labels inside the canvas.
- Use 8 to 30 shapes. Draw in a sensible order: main subject first, then arrows and labels.
- No gradients, images, filters, scripts, styles, foreignObject or external links.`;
