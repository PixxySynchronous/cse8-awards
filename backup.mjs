// Downloads every photo and note into ./backup/ (run `npx vercel env pull` first for the storage token).
//   node --env-file=.env.local backup.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { list } from "@vercel/blob";

let cursor, n = 0;
do {
  const page = await list({ cursor, limit: 1000 });
  for (const b of page.blobs) {
    const out = `backup/${b.pathname}`;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(await (await fetch(b.url)).arrayBuffer()));
    n++;
  }
  cursor = page.cursor;
} while (cursor);
console.log(`${n} files saved in ./backup`);
