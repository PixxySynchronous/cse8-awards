import { del, put } from "@vercel/blob";
import { FILES_HOST, isSession, json } from "./_lib.js";

// POST {s, k, t, caps: {photoUrl: title}, prev: [old caption-file urls]}
// all of a board's titles live in one small file; each save writes a new one (fresh url, so no stale cache) and removes the old
export async function POST(request) {
  const { s, k, t, caps, prev } = await request.json().catch(() => ({}));
  if (!(await isSession(s, k, t))) return json({ error: "Log in to your board first", relogin: true }, 401);

  const clean = {};
  for (const [url, title] of Object.entries(caps || {})) {
    const v = String(title || "").trim().slice(0, 60);
    if (v && typeof url === "string" && url.includes(`${FILES_HOST}/b/${s}/photos/`)) clean[url] = v;
  }
  const blob = await put(`b/${s}/caps/${Date.now()}.json`, JSON.stringify(clean), { access: "public", contentType: "application/json", addRandomSuffix: true });

  const old = (Array.isArray(prev) ? prev : []).filter(u => typeof u === "string" && u.includes(`${FILES_HOST}/b/${s}/caps/`));
  if (old.length) await del(old).catch(() => {});
  return json({ caps: clean, capsUrl: blob.url });
}
