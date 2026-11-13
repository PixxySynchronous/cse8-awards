import { put } from "@vercel/blob";
import { NAMES, NOTE_COLORS, isSession, json } from "./_lib.js";

// POST {to, from, k, t, text, c}; the note is signed with the writer's name from their logged-in certificate
export async function POST(request) {
  const { to, from, k, t, text, c } = await request.json().catch(() => ({}));
  if (!(await isSession(from, k, t))) return json({ error: "Log in on your own page first", relogin: true }, 401);
  if (!(to in NAMES)) return json({ error: "Unknown student" }, 404);
  if (to === from) return json({ error: "You can't leave a note on your own board" }, 400);
  const clean = String(text || "").trim().slice(0, 300);
  if (!clean) return json({ error: "Note is empty" }, 400);

  const note = { from, name: NAMES[from], text: clean, c: NOTE_COLORS.includes(c) ? c : NOTE_COLORS[0], ts: Date.now() };
  const blob = await put(`b/${to}/notes/${from}/${note.ts}.json`, JSON.stringify(note), {
    access: "public", contentType: "application/json", addRandomSuffix: true,
  });
  return json({ ...note, url: blob.url });
}
