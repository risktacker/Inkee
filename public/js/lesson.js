// The lesson player: one step at a time, drawing in sync with narration.
import { inkIn, outline, sanitizeSvg, SVG_NS } from "./ink.js";
import { speakingMs, voice } from "./voice.js";

const $ = s => document.querySelector(s);

export class LessonPlayer {
  constructor({ onExit }) {
    this.onExit = onExit;
    this.lesson = null;
    this.index = 0;
    this.run = 0; // increments on every navigation, so stale timers and callbacks do nothing
    $("#prev").onclick = () => this.go(this.index - 1, { manual: true });
    $("#next").onclick = () => (this.isLast ? this.exit() : this.go(this.index + 1, { manual: true }));
    $("#back").onclick = () => this.exit();
  }

  get isLast() { return this.lesson && this.index >= this.lesson.steps.length - 1; }

  /** lesson: { kind: "question" | "photo", title, steps: [{ heading, narration, svg?, box? }], image? } */
  open(lesson) {
    this.lesson = { ...lesson, autoplay: true };
    $("#lessonTitle").textContent = lesson.title;
    const list = $("#steps");
    list.replaceChildren(...lesson.steps.map((s, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.textContent = `${i + 1}. ${s.heading}`;
      b.onclick = () => this.go(i, { manual: true });
      li.append(b);
      return li;
    }));
    this.go(0);
  }

  /** Called when a step's drawing arrives after the step was already shown. */
  stepReady(i) {
    if (this.lesson && i === this.index) this.go(i, { replay: false });
  }

  exit() {
    this.run++;
    voice.stop();
    this.onExit();
  }

  go(i, { manual = false, replay = true } = {}) {
    if (!this.lesson) return;
    if (manual) this.lesson.autoplay = false;
    const steps = this.lesson.steps;
    this.index = Math.max(0, Math.min(i, steps.length - 1));
    const run = ++this.run;
    const step = steps[this.index];

    $("#counter").textContent = `${this.index + 1} / ${steps.length}`;
    $("#prev").disabled = this.index === 0;
    $("#next").textContent = this.isLast ? "Ask another" : "Next";
    document.querySelectorAll("#steps button").forEach((b, j) => b.classList.toggle("on", j === this.index));

    const duration = speakingMs(step.narration);
    const board = document.createElement("div");
    board.className = "board";
    const ready = this.renderBoard(board, step, duration);

    const words = document.createElement("div");
    words.className = "words";
    const n = Object.assign(document.createElement("span"), { className: "n", textContent: `Step ${this.index + 1}` });
    const h = Object.assign(document.createElement("h3"), { textContent: step.heading });
    const p = Object.assign(document.createElement("p"), { textContent: step.narration });
    words.append(n, h, p);

    const frame = document.createElement("div");
    frame.className = "frame";
    frame.append(board, words);
    $("#stage").replaceChildren(frame);

    if (!ready || !replay && !this.lesson.autoplay) return;
    Promise.all([voice.say(step.narration), wait(duration)]).then(() => {
      if (run !== this.run || !this.lesson.autoplay || this.isLast) return;
      const next = steps[this.index + 1];
      if (this.lesson.kind === "photo" || next.svg) this.go(this.index + 1);
    });
  }

  /** Fill the drawing area. Returns false while the drawing is still on its way. */
  renderBoard(board, step, duration) {
    if (this.lesson.kind === "photo") {
      board.append(this.photo(duration));
      return true;
    }
    if (!step.svg) {
      board.innerHTML = `<span class="wait">drawing…</span>`;
      return false;
    }
    const svg = sanitizeSvg(step.svg);
    if (!svg) {
      board.innerHTML = `<span class="wait">this drawing didn't come out right</span>`;
      return true;
    }
    board.append(svg);
    inkIn(svg, duration);
    return true;
  }

  /** The photo with every part found so far outlined, and the current part traced and labelled. */
  photo(duration) {
    const wrap = document.createElement("div");
    wrap.className = "photo-wrap";
    const img = new Image();
    img.src = this.lesson.image;
    img.alt = this.lesson.title;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 1000 1000");
    svg.setAttribute("preserveAspectRatio", "none");
    wrap.append(img, svg);

    this.lesson.steps.forEach((s, j) => {
      if (!s.box || j > this.index) return;
      const active = j === this.index;
      outline(svg, s.box, { active, durationMs: duration });
      const label = document.createElement("span");
      label.className = "part-label" + (active ? " on" : "");
      label.textContent = s.heading;
      label.style.left = `${Math.min(80, s.box[0] * 100)}%`;
      label.style.top = `${Math.max(0, s.box[1] * 100 - 6)}%`;
      wrap.append(label);
    });
    return wrap;
  }
}

const wait = ms => new Promise(r => setTimeout(r, ms));
