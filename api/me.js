import { NAMES, getAuth, isAdmin, isStudent, isSession, json } from "./_lib.js";

// POST {s, k} -> is this a real certificate, and has its owner set a password yet?
// POST {s, k, t} -> also says whether the stored session is still valid
// POST {admin} -> confirms the admin key
export async function POST(request) {
  const { s, k, t, admin } = await request.json().catch(() => ({}));
  if (admin) return json({ ok: isAdmin(admin) });
  if (!isStudent(s, k)) return json({ ok: false });
  if (t) return json({ ok: true, name: NAMES[s], session: await isSession(s, k, t) });
  return json({ ok: true, name: NAMES[s], claimed: !!(await getAuth(s)) });
}
