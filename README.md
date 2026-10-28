# Inkee

**Ask anything, see it drawn.**

Inkee explains hard ideas as short, narrated, step-by-step drawings. Type a question, or take a photo of an object, and Inkee teaches it the way a good teacher does at a whiteboard: one idea at a time, drawn while it is explained.

Built solo by [Esiah Kapinga](https://github.com/risktacker) for the **Meta Global AI Developer Hackathon** (Oct 26 – Nov 4, 2026), Indie Dev track. All code in this repository was written during the hackathon.

## How it works

| Step | What happens | Meta model |
|---|---|---|
| Plan | The question becomes a 4–6 step lesson: a heading, a spoken narration and a drawing brief per step | Muse Spark (`muse-spark-1.3`) |
| Draw | Each step is drawn as clean SVG line art, in parallel, while the first step is already playing | Muse Spark |
| Ink in | The browser traces every stroke like a pen, timed to the narration | — |
| Narrate | Each step is read aloud in sync with its drawing | Browser speech |
| Photo mode | Muse Spark reads the photo and names the object's parts; SAM 3.1 then locates each part precisely, in parallel; Inkee outlines and narrates them | Muse Spark (vision) + SAM 3.1 |

Drawings are generated as vectors, not images, so lessons appear in seconds, scale to any screen and need no storage.

**Safety:** Inkee refuses medical diagnosis, political topics and anything that would identify a person. Photo mode explains objects only. Model SVG output is sanitised in the browser to an allowlist of drawing elements.

## Run it

Deployed on Cloudflare Pages with Pages Functions. Requires Node 20+.

```bash
npm i -g wrangler
echo 'MODEL_API_KEY=your_meta_key' > .dev.vars
npm run dev      # local server with the API routes
npm test         # unit and API tests (Meta's API is faked; no key needed)
```

Environment variables: `MODEL_API_KEY` (required), `META_MODEL` (default `muse-spark-1.3`), `SAM_MODEL` (default `sam-3.1`), `META_API_BASE` (default `https://api.meta.ai/v1`).

Without a key, the **Sample lesson** button plays a built-in lesson so the interface can be tried offline.

## Project structure

```
functions/api/   HTTP routes: plan.js, draw.js, photo.js (thin handlers)
lib/             server logic: meta.js (Muse Spark + SAM 3.1 client), prompts.js, geometry.js, http.js
public/          the app: index.html, styles.css
public/js/       main.js (wiring), lesson.js (player), ink.js (SVG sanitising + pen animation),
                 voice.js (narration), api.js (requests, photo resizing), sample.js (offline lesson)
test/            node:test suites for the library and every API route
```

No build step and no runtime dependencies.

## Built during the hackathon

Everything in this repository was written during the Meta Global AI Developer Hackathon, starting October 28, 2026; the commit history is the record. The idea grew out of the author's earlier work turning topics into illustrated explainer videos, but no code from that project is used here.

## License

[MIT](LICENSE)
