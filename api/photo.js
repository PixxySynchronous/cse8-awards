import { put } from "@vercel/blob";
import { isSession, json } from "./_lib.js";

// POST raw JPEG body with headers x-s / x-k / x-t; only the board's logged-in owner can add photos
export async function POST(request) {
  const s = request.headers.get("x-s");
  if (!(await isSession(s, request.headers.get("x-k"), request.headers.get("x-t")))) return json({ error: "Log in to your board first", relogin: true }, 401);
  if (request.headers.get("content-type") !== "image/jpeg") return json({ error: "JPEG only" }, 415);

  const body = await request.arrayBuffer();
  if (body.byteLength > 4_000_000) return json({ error: "Photo too large" }, 413);

  const blob = await put(`b/${s}/photos/${Date.now()}.jpg`, body, { access: "public", contentType: "image/jpeg", addRandomSuffix: true });
  return json({ url: blob.url });
}
