// Inkee: ask anything, see it drawn.
import { api, shrinkImage } from "./api.js";
import { LessonPlayer } from "./lesson.js";
import { SAMPLE_LESSON } from "./sample.js";
import { voice } from "./voice.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const DRAW_CONCURRENCY = 3;

const player = new LessonPlayer({ onExit: () => show("ask") });

function show(view) {
  $("#ask").hidden = view !== "ask";
  $("#lesson").hidden = view !== "lesson";
  if (view === "lesson") status("");
}

function status(message, { error = false, action } = {}) {
  const el = $("#status");
  el.hidden = !message;
  el.className = "status" + (error ? " err" : "");
  el.textContent = message || "";
  if (action) {
    const b = Object.assign(document.createElement("button"), { className: "chip", textContent: action.label, onclick: action.run });
    el.append(b);
  }
}

function fail(error) {
  const msg = String(error?.message || error);
  const notConnected = /MODEL_API_KEY|Failed to fetch|NetworkError|\(404\)/.test(msg);
  status(notConnected ? "Inkee isn't connected to Meta's models here yet." : msg, {
    error: true,
    action: { label: "Play the sample lesson", run: playSample },
  });
}

async function askQuestion(question) {
  question = question.trim();
  if (!question) return;
  status("Planning your lesson…");
  try {
    const plan = await api.plan(question);
    if (plan.refused) return status(plan.reason, { error: true });
    const steps = plan.steps.map(s => ({ ...s }));
    player.open({ kind: "question", title: plan.title, steps });
    show("lesson");
    drawAll(plan.title, steps);
  } catch (e) { fail(e); }
}

/** Draw every step, a few at a time, in order, so step 1 is ready first. */
function drawAll(title, steps) {
  let next = 0;
  const worker = async () => {
    while (next < steps.length) {
      const i = next++;
      try { steps[i].svg = (await api.draw(title, steps[i])).svg; }
      catch { steps[i].svg = `<svg viewBox="0 0 400 300"><text x="200" y="150" text-anchor="middle" font-size="16" fill="currentColor">drawing unavailable</text></svg>`; }
      player.stepReady(i);
    }
  };
  for (let k = 0; k < DRAW_CONCURRENCY; k++) worker();
}

async function explainPhoto(file) {
  if (!file) return;
  status("Reading your photo…");
  try {
    const photo = await shrinkImage(file);
    const out = await api.photo(photo);
    if (out.refused) return status(out.reason, { error: true });
    const steps = out.parts.map(p => ({ heading: p.name, narration: p.narration, box: p.box }));
    if (out.summary) steps.push({ heading: "How it all works", narration: out.summary, box: null });
    player.open({ kind: "photo", title: out.object, image: photo.image, steps });
    show("lesson");
  } catch (e) { fail(e); }
}

function playSample() {
  player.open({ kind: "question", title: SAMPLE_LESSON.title, steps: SAMPLE_LESSON.steps.map(s => ({ ...s })) });
  show("lesson");
}

/* ---------- wiring ---------- */
$$(".mode").forEach(tab => tab.addEventListener("click", () => {
  $$(".mode").forEach(t => { t.classList.toggle("active", t === tab); t.setAttribute("aria-selected", String(t === tab)); });
  $$(".panel").forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.mode; });
}));
$("#askForm").addEventListener("submit", e => { e.preventDefault(); askQuestion($("#question").value); });
$("#photo").addEventListener("change", e => explainPhoto(e.target.files[0]));
$$(".chip[data-q]").forEach(c => c.addEventListener("click", () => { $("#question").value = c.dataset.q; askQuestion(c.dataset.q); }));
$("#sample").addEventListener("click", playSample);

const voiceButton = $("#voiceBtn");
const paintVoice = () => { voiceButton.setAttribute("aria-pressed", String(voice.enabled)); voiceButton.textContent = voice.enabled ? "🔊" : "🔇"; };
voiceButton.addEventListener("click", () => { voice.toggle(); paintVoice(); });
paintVoice();
