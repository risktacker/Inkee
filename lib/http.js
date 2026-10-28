// Small HTTP helpers shared by the API routes.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Read a JSON body, rejecting anything larger than `maxBytes`. */
export async function readJson(request, maxBytes = 64_000) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "That request is too large.");
  try { return JSON.parse(text); } catch { throw new HttpError(400, "Send a JSON body."); }
}

/** Wrap a route so every failure becomes a clean JSON error. */
export function route(handler) {
  return async ctx => {
    try {
      return json(await handler(ctx));
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 502;
      return json({ error: String(e?.message || e) }, status);
    }
  };
}
