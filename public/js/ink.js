// Turning model SVG into safe, animated line art.

const SVG_NS = "http://www.w3.org/2000/svg";
const ALLOWED_TAGS = new Set(["svg", "g", "path", "line", "circle", "ellipse", "rect", "polyline", "polygon", "text", "tspan"]);
const ALLOWED_ATTRS = new Set([
  "viewBox", "d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "points",
  "transform", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
  "font-size", "text-anchor", "dominant-baseline", "opacity",
]);
const STROKES = "path,line,circle,ellipse,rect,polyline,polygon";

/** Parse model output into an SVG element that contains only drawing elements and attributes. */
export function sanitizeSvg(source) {
  let text = String(source).trim();
  if (!/<svg[^>]*\sxmlns=/.test(text)) text = text.replace(/<svg\b/, `<svg xmlns="${SVG_NS}"`);
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.querySelector("svg");
  if (!root || doc.querySelector("parsererror")) return null;

  const clean = el => {
    for (const a of [...el.attributes]) if (!ALLOWED_ATTRS.has(a.name)) el.removeAttribute(a.name);
    for (const child of [...el.children]) {
      if (ALLOWED_TAGS.has(child.tagName.toLowerCase())) clean(child);
      else child.remove();
    }
  };
  clean(root);
  if (!root.getAttribute("viewBox")) root.setAttribute("viewBox", "0 0 400 300");
  root.removeAttribute("width");
  root.removeAttribute("height");
  return document.importNode(root, true);
}

/** Trace every stroke like a pen, then fade labels in. Returns the total animation time in ms. */
export function inkIn(svg, durationMs) {
  const shapes = [...svg.querySelectorAll(STROKES)];
  const labels = [...svg.querySelectorAll("text")];
  const lengths = shapes.map(s => { try { return Math.max(1, s.getTotalLength()); } catch { return 100; } });
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const drawMs = Math.max(900, durationMs * 0.8);

  let t = 0;
  shapes.forEach((shape, i) => {
    const len = lengths[i];
    const ms = Math.max(120, (drawMs * len) / total);
    shape.style.strokeDasharray = `${len}`;
    shape.style.strokeDashoffset = `${len}`;
    shape.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, delay: t, fill: "forwards", easing: "ease-in-out" });
    t += ms * 0.85;
  });
  labels.forEach((label, i) => {
    label.style.opacity = 0;
    label.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: t + i * 250, fill: "forwards" });
  });
  return t + labels.length * 250 + 400;
}

/** Draw a rectangle outline around a part of a photo, traced like a pen. */
export function outline(svg, [x, y, w, h], { active, durationMs }) {
  const r = document.createElementNS(SVG_NS, "rect");
  const attrs = { x: x * 1000, y: y * 1000, width: w * 1000, height: h * 1000, rx: 18, fill: "none", stroke: "currentColor", "stroke-width": active ? 7 : 3, opacity: active ? 1 : 0.55 };
  for (const [k, v] of Object.entries(attrs)) r.setAttribute(k, v);
  r.setAttribute("vector-effect", "non-scaling-stroke");
  svg.append(r);
  if (active) {
    const len = 2000 * (w + h);
    r.style.strokeDasharray = len;
    r.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: Math.min(1600, durationMs * 0.5), fill: "forwards", easing: "ease-in-out" });
  }
}

export { SVG_NS };
