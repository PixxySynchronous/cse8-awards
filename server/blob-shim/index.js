// Stands in for @vercel/blob on the VPS: same calls, but files live on this server's disk.
// The api/ handlers stay untouched, so moving back to Vercel only means deploying api/ again.
import { link, mkdir, readdir, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { dirname, join, resolve, sep } from "node:path";

const DATA = resolve(process.env.DATA_DIR);
const ORIGIN = `https://${process.env.FILES_HOST}`;

function onDisk(pathname) {
  const p = resolve(DATA, pathname);
  if (!p.startsWith(DATA + sep)) throw new Error("Bad path");
  return p;
}
const toPathname = u => u.startsWith(ORIGIN + "/") ? decodeURIComponent(new URL(u).pathname.slice(1)) : u;
const urlFor = pathname => `${ORIGIN}/${pathname.split("/").map(encodeURIComponent).join("/")}`;
const meta = (pathname, s) => ({ pathname, url: urlFor(pathname), downloadUrl: urlFor(pathname), size: s.size, uploadedAt: new Date(Math.floor(s.mtimeMs)) });

async function walk(dir, base, out) {
  let items;
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const it of items) {
    const rel = base ? `${base}/${it.name}` : it.name;
    if (it.isDirectory()) await walk(join(dir, it.name), rel, out);
    else if (it.isFile() && !it.name.startsWith(".tmp-")) out.push(meta(rel, await stat(join(dir, it.name))));
  }
}

export async function list({ prefix = "" } = {}) {
  const base = prefix.replace(/\/[^/]*$/, "").replace(/\/$/, "");
  const blobs = [];
  await walk(base ? onDisk(base) : DATA, base, blobs);
  return { blobs: blobs.filter(b => b.pathname.startsWith(prefix)), hasMore: false, cursor: undefined };
}

export async function head(pathname) {
  return meta(pathname, await stat(onDisk(pathname)));
}

export async function put(pathname, body, { addRandomSuffix = false } = {}) {
  const final = addRandomSuffix ? pathname.replace(/(\.[^./]+)?$/, ext => `-${randomBytes(15).toString("base64url")}${ext}`) : pathname;
  const target = onDisk(final);
  await mkdir(dirname(target), { recursive: true });
  // write beside it, then link into place: readers never see half a file, and an existing file is never overwritten
  const tmp = join(dirname(target), `.tmp-${randomBytes(6).toString("hex")}`);
  await writeFile(tmp, typeof body === "string" ? body : Buffer.from(body));
  try { await link(tmp, target); } finally { await unlink(tmp); }
  return { pathname: final, url: urlFor(final), downloadUrl: urlFor(final) };
}

export async function del(what) {
  for (const u of Array.isArray(what) ? what : [what]) await rm(onDisk(toPathname(u)), { force: true });
}

// the handlers fetch() stored notes, titles and passwords by url; read those straight from disk
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const u = String(input?.url ?? input);
  if (!u.startsWith(ORIGIN + "/")) return realFetch(input, init);
  try { return new Response(await readFile(onDisk(toPathname(u.split("?")[0])))); }
  catch { return new Response("Not found", { status: 404 }); }
};
