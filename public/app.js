(() => {
"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

/* ---------- state ---------- */
let lesson = null;      // {title, steps:[{heading,narration,drawing?,svg?,box?}], kind:"type"|"photo", image?}
let idx = 0, runId = 0;
let voiceOn = true;
try { voiceOn = localStorage.getItem("inkee-voice") !== "off"; } catch {}

/* ---------- ui helpers ---------- */
function status(msg, err = false, action) {
  const el = $("#status");
  if (!msg) { el.classList.add("hidden"); return; }
  el.className = "status" + (err ? " err" : "");
  el.textContent = msg;
  if (action) { const b = document.createElement("button"); b.className = "chip"; b.textContent = action.label; b.onclick = action.run; el.append(b); }
}
function view(name) {
  $("#ask").classList.toggle("hidden", name !== "ask");
  $("#lesson").classList.toggle("hidden", name !== "lesson");
}
function voiceBtn() { const b = $("#voiceBtn"); b.setAttribute("aria-pressed", String(voiceOn)); b.textContent = voiceOn ? "🔊" : "🔇"; }

/* ---------- SVG safety: keep only drawing elements and attributes ---------- */
const OK_TAGS = new Set(["svg","g","path","line","circle","ellipse","rect","polyline","polygon","text","tspan"]);
const OK_ATTR = new Set(["viewBox","d","x","y","x1","y1","x2","y2","cx","cy","r","rx","ry","width","height","points","transform","fill","stroke","stroke-width","stroke-linecap","stroke-linejoin","stroke-dasharray","font-size","text-anchor","dominant-baseline","opacity"]);
function cleanSvg(src) {
  // Model output often omits the namespace; without it nothing is a real SVG element.
  let text = String(src).trim();
  if (!/<svg[^>]*\sxmlns=/.test(text)) text = text.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.querySelector("svg");
  if (!root || doc.querySelector("parsererror")) return null;
  const walk = el => {
    for (const c of [...el.children]) {
      if (!OK_TAGS.has(c.tagName.toLowerCase())) { c.remove(); continue; }
      for (const a of [...c.attributes]) if (!OK_ATTR.has(a.name)) c.removeAttribute(a.name);
      walk(c);
    }
  };
  for (const a of [...root.attributes]) if (!OK_ATTR.has(a.name)) root.removeAttribute(a.name);
  if (!root.getAttribute("viewBox")) root.setAttribute("viewBox", "0 0 400 300");
  root.removeAttribute("width"); root.removeAttribute("height");
  walk(root);
  const out = document.importNode(root, true);
  out.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return out;
}

/* ---------- pen-drawing animation ---------- */
function inkIn(svg, totalMs) {
  const shapes = [...svg.querySelectorAll("path,line,circle,ellipse,rect,polyline,polygon")];
  const texts = [...svg.querySelectorAll("text")];
  texts.forEach(t => t.style.opacity = 0);
  const lens = shapes.map(s => { try { return Math.max(1, s.getTotalLength()); } catch { return 100; } });
  const sum = lens.reduce((a, b) => a + b, 0) || 1;
  const drawMs = Math.max(900, totalMs * 0.8);
  let t = 0;
  const anims = shapes.map((s, i) => {
    const L = lens[i], d = Math.max(120, drawMs * L / sum);
    s.style.strokeDasharray = `${L}`; s.style.strokeDashoffset = `${L}`;
    if (s.getAttribute("fill") && s.getAttribute("fill") !== "none") s.style.fillOpacity = 0;
    const a = s.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: d, delay: t, fill: "forwards", easing: "ease-in-out" });
    t += d * 0.85;
    return a;
  });
  texts.forEach((tx, i) => tx.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: t + i * 250, fill: "forwards" }));
  return t + texts.length * 250 + 400;
}

/* ---------- narration ---------- */
function speak(text) {
  return new Promise(resolve => {
    if (!voiceOn || !("speechSynthesis" in window) || !text) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1;
    const v = speechSynthesis.getVoices().find(v => /en[-_](GB|US|ZA)/i.test(v.lang) && /natural|google|samantha|daniel/i.test(v.name));
    if (v) u.voice = v;
    u.onend = u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}
const estimateMs = text => Math.max(2500, String(text || "").split(/\s+/).length * 380);

/* ---------- render a step ---------- */
function renderStep(i, autoplay = true) {
  if (!lesson) return;
  idx = Math.max(0, Math.min(i, lesson.steps.length - 1));
  const my = ++runId;
  const s = lesson.steps[idx];
  $("#counter").textContent = `${idx + 1} / ${lesson.steps.length}`;
  $("#prev").disabled = idx === 0;
  $("#next").textContent = idx === lesson.steps.length - 1 ? "Ask another" : "Next";
  $$("#steps button").forEach((b, j) => b.classList.toggle("on", j === idx));

  const stage = $("#stage"); stage.innerHTML = "";
  const frame = document.createElement("div"); frame.className = "frame";
  const board = document.createElement("div"); board.className = "board";
  const words = document.createElement("div"); words.className = "words";
  words.innerHTML = `<span class="n">Step ${idx + 1}</span><h3></h3><p></p>`;
  words.querySelector("h3").textContent = s.heading || "";
  words.querySelector("p").textContent = s.narration || "";
  frame.append(board, words); stage.append(frame);

  const dur = estimateMs(s.narration);
  if (lesson.kind === "photo") {
    board.append(photoOverlay(idx, dur));
  } else if (s.svg) {
    const svg = cleanSvg(s.svg);
    if (svg) { board.append(svg); inkIn(svg, dur); } else board.innerHTML = `<span class="wait">couldn't draw this one</span>`;
  } else {
    board.innerHTML = `<span class="wait">drawing…</span>`;
    s._waiters = (s._waiters || []).concat(() => { if (my === runId) renderStep(idx, false); });
  }
  if (autoplay || s.svg || lesson.kind === "photo") {
    const spoken = speak(s.narration);
    if (lesson.autoplay) Promise.all([spoken, new Promise(r => setTimeout(r, dur))]).then(() => {
      if (my !== runId || idx >= lesson.steps.length - 1) return;
      const nx = lesson.steps[idx + 1];
      if (nx.svg || lesson.kind === "photo") renderStep(idx + 1);
    });
  }
}

function photoOverlay(upto, dur) {
  const wrap = document.createElement("div"); wrap.className = "photo-wrap";
  const img = new Image(); img.src = lesson.image; img.alt = lesson.title;
  wrap.append(img);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 1000 1000"); svg.setAttribute("preserveAspectRatio", "none");
  svg.style.color = "var(--hi)";
  lesson.steps.forEach((s, j) => {
    if (!s.box || j > upto) return;
    const [x, y, w, h] = s.box.map(n => Math.max(0, Math.min(1, n)) * 1000);
    const r = document.createElementNS(ns, "rect");
    Object.entries({ x, y, width: w, height: h, rx: 18, fill: "none", stroke: "currentColor", "stroke-width": j === upto ? 7 : 3, opacity: j === upto ? 1 : .55 }).forEach(([k, v]) => r.setAttribute(k, v));
    r.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(r);
    if (j === upto) {
      const L = 2 * (w + h);
      r.style.strokeDasharray = L; r.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: Math.min(1600, dur * .5), fill: "forwards", easing: "ease-in-out" });
    }
  });
  wrap.append(svg);
  // labels as HTML so text isn't stretched
  lesson.steps.forEach((s, j) => {
    if (!s.box || j > upto) return;
    const lab = document.createElement("span");
    lab.textContent = s.heading;
    lab.style.cssText = `position:absolute;left:${Math.min(80, s.box[0] * 100)}%;top:${Math.max(0, s.box[1] * 100 - 6)}%;font-family:var(--hand);font-weight:700;font-size:${j === upto ? 22 : 16}px;color:var(--hi);background:var(--board);padding:0 6px;border-radius:6px;opacity:${j === upto ? 1 : .7}`;
    wrap.append(lab);
  });
  return wrap;
}

function openLesson(data) {
  lesson = data; idx = 0;
  $("#lessonTitle").textContent = lesson.title;
  $("#steps").innerHTML = "";
  lesson.steps.forEach((s, j) => {
    const li = document.createElement("li"), b = document.createElement("button");
    b.textContent = `${j + 1}. ${s.heading}`; b.onclick = () => { lesson.autoplay = false; renderStep(j); };
    li.append(b); $("#steps").append(li);
  });
  view("lesson"); status("");
  renderStep(0);
}

/* ---------- API ---------- */
async function post(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok || j.error) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}

async function ask(question) {
  question = question.trim(); if (!question) return;
  status("Planning your lesson…");
  try {
    const plan = await post("/api/plan", { question });
    if (plan.refused) return status(plan.reason || "Inkee can't explain that one.", true);
    const data = { kind: "type", title: plan.title, steps: plan.steps.map(s => ({ ...s })), autoplay: true };
    openLesson(data);
    // draw steps in parallel (3 at a time), first step first
    let next = 0;
    const worker = async () => {
      while (next < data.steps.length) {
        const s = data.steps[next++];
        try { s.svg = (await post("/api/draw", { title: data.title, heading: s.heading, drawing: s.drawing })).svg; }
        catch { s.svg = `<svg viewBox="0 0 400 300"><text x="120" y="150" font-size="16" fill="currentColor">drawing unavailable</text></svg>`; }
        (s._waiters || []).forEach(f => f()); s._waiters = [];
      }
    };
    worker(); worker(); worker();
  } catch (e) { fail(e); }
}

async function explainPhoto(file) {
  if (!file) return;
  status("Reading your photo…");
  try {
    const image = await shrink(file, 1024);
    const out = await post("/api/photo", { image });
    if (out.refused) return status(out.reason || "Inkee only explains objects.", true);
    const steps = out.parts.map(p => ({ heading: p.name, narration: p.narration, box: p.box }));
    if (out.summary) steps.push({ heading: "How it works together", narration: out.summary, box: null });
    openLesson({ kind: "photo", title: out.object, image, steps, autoplay: true });
  } catch (e) { fail(e); }
}

function fail(e) {
  const msg = String(e.message || e);
  const offline = /MODEL_API_KEY|Failed to fetch|NetworkError|404/.test(msg);
  status(offline ? "Inkee's connection to Meta's models isn't set up here yet." : `Something went wrong: ${msg}`, true,
    { label: "See the sample lesson", run: sample });
}

function shrink(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", .85));
    };
    img.onerror = () => reject(new Error("That file isn't an image Inkee can read."));
    img.src = url;
  });
}

function sample() { const s = window.INKEE_SAMPLE; openLesson({ kind: "type", title: s.title, steps: s.steps.map(x => ({ ...x })), autoplay: true }); }

/* ---------- wiring ---------- */
$$(".mode").forEach(b => b.onclick = () => {
  $$(".mode").forEach(m => { m.classList.toggle("active", m === b); m.setAttribute("aria-selected", String(m === b)); });
  $$(".panel").forEach(p => p.classList.toggle("hidden", p.dataset.panel !== b.dataset.mode));
});
$("#askForm").onsubmit = e => { e.preventDefault(); ask($("#question").value); };
$("#photo").onchange = e => explainPhoto(e.target.files[0]);
$$(".chip[data-q]").forEach(c => c.onclick = () => { $("#question").value = c.dataset.q; ask(c.dataset.q); });
$(".chip.sample").onclick = sample;
$("#prev").onclick = () => { lesson.autoplay = false; renderStep(idx - 1); };
$("#next").onclick = () => {
  if (idx >= lesson.steps.length - 1) { speechSynthesis?.cancel(); runId++; view("ask"); return; }
  lesson.autoplay = false; renderStep(idx + 1);
};
$("#back").onclick = () => { speechSynthesis?.cancel(); runId++; view("ask"); };
$("#voiceBtn").onclick = () => { voiceOn = !voiceOn; try { localStorage.setItem("inkee-voice", voiceOn ? "on" : "off"); } catch {} voiceBtn(); if (!voiceOn) speechSynthesis?.cancel(); };
voiceBtn();
if ("speechSynthesis" in window) speechSynthesis.getVoices();
})();
