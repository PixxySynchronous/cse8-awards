import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { head } from "@vercel/blob";
import { NAMES } from "./_names.js";

export { NAMES };

// each student's key is derived from one secret, so no key list is stored anywhere
export const keyFor = id => createHmac("sha256", process.env.SECRET).update(id).digest("base64url").slice(0, 12);

const same = (a, b) => typeof a === "string" && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const isStudent = (id, k) => id in NAMES && same(k, keyFor(id));
export const isAdmin = k => !!process.env.ADMIN_KEY && same(k, process.env.ADMIN_KEY);

// a printed QR alone only identifies the board; editing also needs the password its owner set on first scan.
// auth/<id>.json holds {salt, hash}. A session token is tied to the file's upload time, read with head(), which is
// never cached; the file's contents can be served stale for up to a minute after a reset, so only logins read them.
export const authPath = id => `auth/${id}.json`;
export async function authMeta(id) {
  try { const h = await head(authPath(id)); return { url: h.url, at: new Date(h.uploadedAt).getTime() }; }
  catch { return null; }
}
export async function getAuth(id) {
  const m = await authMeta(id);
  if (!m) return null;
  try { return { ...(await (await fetch(`${m.url}?r=${Date.now()}`, { cache: "no-store" })).json()), at: m.at }; }
  catch { return null; }
}
export const newSalt = () => randomBytes(16).toString("base64url");
export const hashPw = (pw, salt) => scryptSync(String(pw), salt, 32).toString("base64url");
export const checkPw = (pw, rec) => same(hashPw(pw, rec.salt), rec.hash);
export const tokenFor = (id, at) => createHmac("sha256", process.env.SECRET).update(`t:${id}:${at}`).digest("base64url").slice(0, 24);
export async function isSession(id, k, t) {
  if (!isStudent(id, k) || typeof t !== "string") return false;
  const m = await authMeta(id);
  return !!m && same(t, tokenFor(id, m.at));
}

// where stored files are served from: Vercel Blob, or the VPS when FILES_HOST is set
export const FILES_HOST = process.env.FILES_HOST || "public.blob.vercel-storage.com";

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });

export const NOTE_COLORS = ["#ffd166", "#ff8fb1", "#7ef0ff", "#c9a7ff", "#ffb36b", "#9dffcf"];
