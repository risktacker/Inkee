// A hand-drawn sample lesson so Inkee can be tried with no network or API key.
window.INKEE_SAMPLE = {
  title: "Why a big front gear makes you faster",
  steps: [
    {
      heading: "One pedal turn",
      narration: "Every time you push the pedals round once, the front gear turns round exactly once too.",
      svg: `<svg viewBox="0 0 400 300"><circle cx="140" cy="160" r="70" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="140" cy="160" r="8" fill="none" stroke="currentColor" stroke-width="3"/><line x1="140" y1="160" x2="190" y2="230" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><rect x="180" y="226" width="34" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M 230 90 A 100 100 0 0 1 250 190" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M 240 180 L 250 192 L 258 178" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="70" y="60" font-size="16" fill="currentColor">front gear</text><text x="262" y="140" font-size="14" fill="currentColor">1 turn</text></svg>`
    },
    {
      heading: "The chain carries teeth",
      narration: "The chain grabs the teeth. A front gear with 48 teeth pulls 48 links of chain for every pedal turn.",
      svg: `<svg viewBox="0 0 400 300"><circle cx="110" cy="150" r="70" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="300" cy="150" r="24" fill="none" stroke="currentColor" stroke-width="3"/><line x1="110" y1="80" x2="300" y2="126" stroke="currentColor" stroke-width="2.5" stroke-dasharray="6 5"/><line x1="110" y1="220" x2="300" y2="174" stroke="currentColor" stroke-width="2.5" stroke-dasharray="6 5"/><path d="M 180 88 L 215 97 L 206 85" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="70" y="155" font-size="16" fill="currentColor">48 teeth</text><text x="270" y="200" font-size="16" fill="currentColor">12 teeth</text><text x="150" y="60" font-size="14" fill="currentColor">chain</text></svg>`
    },
    {
      heading: "The small gear spins more",
      narration: "Those 48 links have to pass round a back gear with only 12 teeth, so the back gear spins four times.",
      svg: `<svg viewBox="0 0 400 300"><circle cx="200" cy="150" r="40" fill="none" stroke="currentColor" stroke-width="3"/><path d="M 200 95 A 55 55 0 1 1 145 150" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M 200 80 A 70 70 0 1 1 130 150" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M 200 65 A 85 85 0 1 1 115 150" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M 200 50 A 100 100 0 1 1 100 150" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><text x="320" y="70" font-size="16" fill="currentColor">48 ÷ 12</text><text x="320" y="95" font-size="16" fill="currentColor">= 4 spins</text></svg>`
    },
    {
      heading: "The wheel goes with it",
      narration: "The back wheel is fixed to that small gear, so one push of the pedals turns the wheel four times. Faster, but each push is harder.",
      svg: `<svg viewBox="0 0 400 300"><circle cx="90" cy="200" r="60" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="310" cy="200" r="60" fill="none" stroke="currentColor" stroke-width="3"/><path d="M 90 200 L 160 120 L 260 120 L 310 200" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M 160 120 L 190 200 L 90 200" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><line x1="260" y1="120" x2="270" y2="95" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="255" y1="95" x2="290" y2="95" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M 20 60 L 120 60" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M 108 50 L 122 60 L 108 70" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="20" y="45" font-size="16" fill="currentColor">faster</text><text x="200" y="45" font-size="14" fill="currentColor">harder to push</text></svg>`
    }
  ]
};
