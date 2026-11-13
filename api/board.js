import { list } from "@vercel/blob";
import { NAMES, json } from "./_lib.js";

// GET /api/board?s=<id> -> the student's photos (oldest first) and notes (newest first)
// everything for a board lives under b/<id>/, so this is one list call (the free plan allows 2,000 a month)
export async function GET(request) {
  const s = new URL(request.url).searchParams.get("s");
  if (!(s in NAMES)) return json({ error: "unknown student" }, 404);

  const { blobs } = await list({ prefix: `b/${s}/` });
  const photos = blobs
    .filter(b => b.pathname.startsWith(`b/${s}/photos/`))
    .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt))
    .map(b => ({ url: b.url }));
  const notes = (await Promise.all(blobs.filter(b => b.pathname.startsWith(`b/${s}/notes/`)).map(async b => {
    try { return { ...(await (await fetch(b.url)).json()), url: b.url }; } catch { return null; }
  }))).filter(Boolean).sort((a, b) => b.ts - a.ts);
  // photo titles: newest caption file wins; any older ones get removed on the next save
  const capFiles = blobs.filter(b => b.pathname.startsWith(`b/${s}/caps/`)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  let caps = {};
  if (capFiles.length) try { caps = await (await fetch(capFiles[0].url)).json(); } catch {}

  // the CDN serves this for 2 minutes; people who just changed a board bypass it with ?t=
  return json({ photos, notes, caps, capsUrls: capFiles.map(b => b.url) }, 200, { "cache-control": "public, s-maxage=120, stale-while-revalidate=600" });
}
