// End-to-end tests of the API routes with Meta's API replaced by a fake.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as plan } from "../functions/api/plan.js";
import { onRequestPost as draw } from "../functions/api/draw.js";
import { onRequestPost as photo } from "../functions/api/photo.js";

const env = { MODEL_API_KEY: "test-key" };
let calls;

function fakeMeta(handler) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), body, auth: init.headers.authorization });
    return new Response(JSON.stringify(handler(String(url), body)), { status: 200 });
  };
}
const chatReply = obj => ({ choices: [{ message: { content: JSON.stringify(obj) } }] });
const req = body => new Request("https://inkee.test/api", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => { calls = []; });

test("plan returns a cleaned lesson and calls Muse Spark", async () => {
  fakeMeta(() => chatReply({ title: "Rainbows", steps: [
    { heading: "Light", narration: "White light is many colours.", drawing: "a beam", extra: "ignored" },
    { heading: "Bending", narration: "Water bends each colour differently.", drawing: "a droplet" },
  ] }));
  const res = await plan({ request: req({ question: "How does a rainbow form?" }), env });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.title, "Rainbows");
  assert.equal(data.steps.length, 2);
  assert.equal(data.steps[0].extra, undefined);
  assert.match(calls[0].url, /\/chat\/completions$/);
  assert.equal(calls[0].body.model, "muse-spark-1.3");
  assert.equal(calls[0].auth, "Bearer test-key");
});

test("plan passes refusals through and rejects empty questions", async () => {
  fakeMeta(() => chatReply({ refused: true, reason: "Inkee doesn't give medical advice." }));
  assert.equal((await (await plan({ request: req({ question: "diagnose my rash" }), env })).json()).refused, true);
  const res = await plan({ request: req({ question: " " }), env });
  assert.equal(res.status, 400);
});

test("missing API key is a clear error", async () => {
  const res = await plan({ request: req({ question: "How do magnets work?" }), env: {} });
  assert.equal(res.status, 502);
  assert.match((await res.json()).error, /MODEL_API_KEY/);
});

test("draw returns the SVG", async () => {
  fakeMeta(() => chatReply({ svg: '<svg viewBox="0 0 400 300"><circle cx="1" cy="1" r="1"/></svg>' }));
  const data = await (await draw({ request: req({ title: "t", heading: "h", drawing: "d" }), env })).json();
  assert.match(data.svg, /^<svg/);
});

test("photo uses SAM 3.1 boxes and falls back to Muse Spark's estimate", async () => {
  fakeMeta((url, body) => {
    if (url.endsWith("/chat/completions")) return chatReply({ object: "Bicycle drivetrain", summary: "They work together.", parts: [
      { name: "Chain", find: "chain", box: [0.5, 0.5, 0.1, 0.1], narration: "Carries the force." },
      { name: "Rear gear", find: "rear gear", box: [0.7, 0.4, 0.2, 0.2], narration: "Turns the wheel." },
    ] });
    const phrase = body.input[0].content[0].text;
    return phrase === "chain"
      ? { output_text: "1<|box;x1=100;y1=200;x2=500;y2=400;w=400;h=200|>" }
      : { output_text: "" };
  });
  const image = "data:image/jpeg;base64,AAAA";
  const data = await (await photo({ request: req({ image, width: 1000, height: 800 }), env })).json();
  assert.equal(data.object, "Bicycle drivetrain");
  assert.deepEqual(data.parts[0].box, [0.1, 0.25, 0.4, 0.25]);
  assert.equal(data.parts[0].source, "sam-3.1");
  assert.deepEqual(data.parts[1].box, [0.7, 0.4, 0.2, 0.2]);
  assert.equal(data.parts[1].source, "muse-spark");
  const sam = calls.filter(c => c.url.endsWith("/responses"));
  assert.equal(sam.length, 2);
  assert.equal(sam[0].body.model, "sam-3.1");
});

test("photo rejects non-images", async () => {
  const res = await photo({ request: req({ image: "data:text/plain;base64,AAAA" }), env });
  assert.equal(res.status, 400);
});
