// Meta Model API client for Inkee.
// Chat completions (Muse Spark) and the Responses API (SAM 3.1), both at api.meta.ai.

export const DEFAULTS = {
  base: "https://api.meta.ai/v1",
  model: "muse-spark-1.3",
  sam: "sam-3.1",
};

function config(env) {
  const key = env.MODEL_API_KEY;
  if (!key) throw new Error("MODEL_API_KEY is not set");
  return {
    key,
    base: env.META_API_BASE || DEFAULTS.base,
    model: env.META_MODEL || DEFAULTS.model,
    sam: env.SAM_MODEL || DEFAULTS.sam,
  };
}

function post(cfg, path, body) {
  return fetch(`${cfg.base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify(body),
  });
}

/** Ask Muse Spark for a JSON object. Retries once without optional fields if they are rejected. */
export async function chatJson(env, messages, { maxTokens = 2000, effort = "low" } = {}) {
  const cfg = config(env);
  const base = { model: cfg.model, messages, max_tokens: maxTokens };
  let res = await post(cfg, "/chat/completions", {
    ...base,
    reasoning_effort: effort,
    response_format: { type: "json_object" },
  });
  if (res.status === 400) res = await post(cfg, "/chat/completions", base);
  if (!res.ok) throw new Error(`Meta API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return parseJson(data?.choices?.[0]?.message?.content ?? "");
}

/** SAM 3.1: find every instance of `phrase` in an image. Returns pixel boxes, best first. */
export async function segment(env, image, phrase) {
  const cfg = config(env);
  const res = await post(cfg, "/responses", {
    model: cfg.sam,
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: phrase },
        { type: "input_image", image_url: image },
      ],
    }],
  });
  if (!res.ok) return [];
  return parseBoxes(responseText(await res.json()));
}

/** The text of a Responses API result, whether or not the server added `output_text`. */
export function responseText(data) {
  if (typeof data?.output_text === "string" && data.output_text) return data.output_text;
  if (!Array.isArray(data?.output)) return "";
  return data.output.flatMap(o => (o.content || []).map(c => c.text || "")).join("\n");
}

const BOX = /(\d+)<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)\|>/g;

/** Parse SAM output like `1<|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..|>`, ordered by rank. */
export function parseBoxes(text) {
  return [...String(text || "").matchAll(BOX)]
    .map(m => {
      const [, ord, x1, y1, x2, y2, w, h] = m.map(Number);
      return { ord, x1, y1, x2, y2, w, h };
    })
    .sort((a, b) => a.ord - b.ord);
}

/** Parse model text as JSON, tolerating code fences or stray prose around the object. */
export function parseJson(text) {
  const t = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(t); } catch { /* fall through */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error("Model did not return JSON");
}
