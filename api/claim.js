import { put } from "@vercel/blob";
import { NAMES, authMeta, authPath, checkPw, getAuth, hashPw, isStudent, json, newSalt, tokenFor } from "./_lib.js";

// slows down password guessing: after 10 wrong tries a board refuses logins for 15 minutes (per server process)
const MAX_TRIES = 10, LOCK_MS = 15 * 60_000;
const tries = new Map();   // id -> {n, since}

// POST {s, k, password}: the first call sets the board's password, later calls log in with it
export async function POST(request) {
  const { s, k, password } = await request.json().catch(() => ({}));
  if (!isStudent(s, k)) return json({ error: "Scan your own certificate" }, 403);
  const pw = String(password || "");
  if (pw.length < 4 || pw.length > 100) return json({ error: "Use at least 4 characters" }, 400);

  const t = tries.get(s);
  if (t && Date.now() - t.since > LOCK_MS) tries.delete(s);
  if (t?.n >= MAX_TRIES && tries.has(s)) return json({ error: "Too many wrong tries. Wait 15 minutes, or ask Piyush to reset your board." }, 429);

  let rec = await getAuth(s);
  if (rec) {
    if (!checkPw(pw, rec)) {
      const cur = tries.get(s) || { n: 0, since: Date.now() };
      tries.set(s, { n: cur.n + 1, since: cur.since });
      return json({ error: "Wrong password. Forgot it? Ask Piyush to reset your board." }, 403);
    }
    tries.delete(s);
  } else {
    const salt = newSalt();
    try {
      // no overwrite: if two phones race to claim, only the first one wins
      await put(authPath(s), JSON.stringify({ salt, hash: hashPw(pw, salt) }), { access: "public", contentType: "application/json", addRandomSuffix: false, cacheControlMaxAge: 60 });
    } catch { return json({ error: "This board was just claimed. Enter its password instead." }, 409); }
    rec = await authMeta(s);
    if (!rec) return json({ error: "Something went wrong. Try again." }, 500);
  }
  return json({ ok: true, name: NAMES[s], t: tokenFor(s, rec.at) });
}
