// Runs the same api/ handlers Vercel ran, as one small Node server behind Caddy.
import { createServer } from "node:http";

const HOST = process.env.FILES_HOST;
const MAX_BODY = 5_000_000;
const ROUTES = {};
for (const name of ["board", "me", "photo", "note", "delete", "claim", "admin", "caption"]) ROUTES[name] = await import(`./api/${name}.js`);

const readBody = req => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  req.on("data", c => {
    size += c.length;
    if (size > MAX_BODY) { reject(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); return; }
    chunks.push(c);
  });
  req.on("end", () => resolve(Buffer.concat(chunks)));
  req.on("error", reject);
});

createServer(async (req, res) => {
  try {
    const name = new URL(req.url, "http://x").pathname.match(/^\/api\/([a-z]+)$/)?.[1];
    const handler = Object.hasOwn(ROUTES, name ?? "") ? ROUTES[name][req.method] : undefined;
    if (!handler) { res.writeHead(404, { "content-type": "application/json" }); return res.end('{"error":"Not found"}'); }

    const init = { method: req.method, headers: req.headers };
    if (req.method !== "GET" && req.method !== "HEAD") init.body = await readBody(req);
    const r = await handler(new Request(`https://${HOST}${req.url}`, init));

    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(err.status || 500, { "content-type": "application/json" });
    res.end('{"error":"Something went wrong"}');
  }
}).listen(3000, "127.0.0.1", () => console.log("cse8 api on 127.0.0.1:3000"));
