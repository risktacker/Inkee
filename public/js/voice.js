// Narration with the browser's built-in speech. Free, instant and offline.

const KEY = "inkee-voice";
let enabled = true;
try { enabled = localStorage.getItem(KEY) !== "off"; } catch { /* storage unavailable */ }

const supported = () => "speechSynthesis" in window;

export const voice = {
  get enabled() { return enabled; },
  toggle() {
    enabled = !enabled;
    try { localStorage.setItem(KEY, enabled ? "on" : "off"); } catch { /* ignore */ }
    if (!enabled) this.stop();
    return enabled;
  },
  stop() { if (supported()) speechSynthesis.cancel(); },
  /** Speak `text`; resolves when finished (immediately if muted or unsupported). */
  say(text) {
    return new Promise(resolve => {
      if (!enabled || !supported() || !text) return resolve();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const preferred = speechSynthesis.getVoices().find(v => /^en[-_]/i.test(v.lang) && /natural|google|samantha|daniel/i.test(v.name));
      if (preferred) u.voice = preferred;
      u.onend = u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  },
};

/** Rough speaking time, used to pace the drawing to the narration. */
export const speakingMs = text => Math.max(2500, String(text || "").split(/\s+/).length * 380);

if (supported()) speechSynthesis.getVoices();
