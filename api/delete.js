import { del } from "@vercel/blob";
import { FILES_HOST, isAdmin, isSession, json } from "./_lib.js";

// POST {url, s, k, t} or {url, admin}
// board owners can remove their photos and any note on their board; writers can remove their own notes
export async function POST(request) {
  const { url, s, k, t, admin } = await request.json().catch(() => ({}));
  let path;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith(FILES_HOST)) throw 0;
    path = decodeURIComponent(u.pathname.slice(1));
    if (path.includes("..")) throw 0;
  } catch { return json({ error: "Bad link" }, 400); }

  // b/<owner>/photos/<file>, b/<owner>/notes/<writer>/<file>
  const [root, owner, kind, writer] = path.split("/");
  if (root !== "b") return json({ error: "Not allowed" }, 403);
  const allowed = isAdmin(admin) || (
    ((kind === "photos" && owner === s) || (kind === "notes" && (owner === s || writer === s))) &&
    await isSession(s, k, t)
  );
  if (!allowed) return json({ error: "Not allowed" }, 403);

  await del(url);
  return json({ ok: true });
}
