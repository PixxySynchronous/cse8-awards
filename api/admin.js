import { del, list } from "@vercel/blob";
import { NAMES, authPath, isAdmin, json } from "./_lib.js";

// POST {admin, action: "claims"} -> ids whose owners have set a password
// POST {admin, action: "reset", s} -> forget that board's password (logs out every device; their photos and notes stay)
export async function POST(request) {
  const { admin, action, s } = await request.json().catch(() => ({}));
  if (!isAdmin(admin)) return json({ error: "Not allowed" }, 403);
  if (action === "claims") {
    const { blobs } = await list({ prefix: "auth/" });
    return json({ claimed: blobs.map(b => ({ id: b.pathname.slice(5, -5), at: b.uploadedAt })) });
  }
  if (action === "reset" && s in NAMES) {
    await del(authPath(s)).catch(() => {});
    return json({ ok: true });
  }
  return json({ error: "Unknown action" }, 400);
}
