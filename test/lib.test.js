import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBoxes, parseJson, responseText } from "../lib/meta.js";
import { isBox, samToFraction } from "../lib/geometry.js";

test("parseJson reads plain, fenced and wrapped JSON", () => {
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJson('```json\n{"a":2}\n```'), { a: 2 });
  assert.deepEqual(parseJson('Here you go: {"a":3} hope that helps'), { a: 3 });
  assert.throws(() => parseJson("no json here"));
});

test("parseBoxes reads SAM 3.1 output in rank order", () => {
  const out = "2<|box;x1=50;y1=60;x2=150;y2=160;w=100;h=100|> 1<|box;x1=10;y1=20;x2=110;y2=220;w=100;h=200|>";
  const boxes = parseBoxes(out);
  assert.equal(boxes.length, 2);
  assert.equal(boxes[0].ord, 1);
  assert.deepEqual(boxes[0], { ord: 1, x1: 10, y1: 20, x2: 110, y2: 220, w: 100, h: 200 });
  assert.deepEqual(parseBoxes(""), []);
});

test("responseText handles both Responses API shapes", () => {
  assert.equal(responseText({ output_text: "hi" }), "hi");
  assert.equal(responseText({ output: [{ content: [{ type: "output_text", text: "a" }, { text: "b" }] }] }), "a\nb");
  assert.equal(responseText({}), "");
});

test("samToFraction uses the image size the client sent", () => {
  const box = samToFraction({ x1: 100, y1: 50, x2: 300, y2: 250, w: 200, h: 200 }, 1000, 500);
  assert.deepEqual(box, [0.1, 0.1, 0.2, 0.4]);
});

test("samToFraction falls back to SAM's w/h only when they look like the image size", () => {
  assert.deepEqual(samToFraction({ x1: 0, y1: 0, x2: 50, y2: 50, w: 100, h: 100 }), [0, 0, 0.5, 0.5]);
  assert.equal(samToFraction({ x1: 0, y1: 0, x2: 50, y2: 50, w: 50, h: 50 }), null);
});

test("samToFraction rejects slivers and isBox validates shape", () => {
  assert.equal(samToFraction({ x1: 0, y1: 0, x2: 2, y2: 400, w: 2, h: 400 }, 1000, 1000), null);
  assert.ok(isBox([0, 0, 0.5, 0.5]));
  assert.ok(!isBox([0, 0, 0.5]));
  assert.ok(!isBox([0, 0, "a", 1]));
});
