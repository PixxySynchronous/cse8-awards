// Copies everything from Vercel Blob into ./migrate/, ready for the VPS.
//   node --env-file=.env.local server/mirror.mjs
// Keeps each file's upload time (photo order and logged-in phones depend on it) and points photo titles at the new host.
import { existsSync, mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { list } from "@vercel/blob";

const NEW = "https://187-126-121-95.sslip.io/";
let cursor, n = 0, skipped = 0;
do {
  const page = await list({ cursor, limit: 1000 });
  for (const b of page.blobs) {
    const out = `migrate/${b.pathname}`;
    if (existsSync(out)) { skipped++; continue; }
    const r = await fetch(b.url);
    if (!r.ok) throw new Error(`${r.status} on ${b.pathname}`);
    let body = Buffer.from(await r.arrayBuffer());
    if (b.pathname.includes("/caps/")) body = Buffer.from(body.toString().replaceAll(new URL(b.url).origin + "/", NEW));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, body);
    const t = new Date(b.uploadedAt);
    utimesSync(out, t, t);
    n++;
  }
  cursor = page.cursor;
} while (cursor);
console.log(`${n} copied, ${skipped} already here`);
