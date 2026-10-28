// Calls to Inkee's own API routes (which call Meta's models server-side).

async function post(path, body) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  plan: question => post("/api/plan", { question }),
  draw: (title, step) => post("/api/draw", { title, heading: step.heading, drawing: step.drawing }),
  photo: ({ image, width, height }) => post("/api/photo", { image, width, height }),
};

/** Resize a photo in the browser before upload: faster, cheaper, and enough detail for the models. */
export function shrinkImage(file, maxSide = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * k);
      canvas.height = Math.round(img.height * k);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ image: canvas.toDataURL("image/jpeg", 0.85), width: canvas.width, height: canvas.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't an image Inkee can read.")); };
    img.src = url;
  });
}
