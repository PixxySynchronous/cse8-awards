// Makes qr/<id>.png (one per certificate) and qr/links.csv.
//   SITE_URL=https://<your-site>.vercel.app node qr.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";

process.env.SECRET = readFileSync(new URL("./.secret", import.meta.url), "utf8").trim();
const { NAMES, keyFor } = await import("./api/_lib.js");
const site = (process.env.SITE_URL || "").replace(/\/$/, "");
if (!site.startsWith("https://")) throw new Error("Set SITE_URL, e.g. SITE_URL=https://cse8-awards.vercel.app node qr.mjs");

mkdirSync("qr", { recursive: true });
const rows = ["id,name,link"];
for (const [id, name] of Object.entries(NAMES)) {
  const link = `${site}/${id}?k=${keyFor(id)}`;
  await QRCode.toFile(`qr/${id}.png`, link, { width: 1000, margin: 2, errorCorrectionLevel: "M" });
  rows.push(`${id},"${name}",${link}`);
}
writeFileSync("qr/links.csv", rows.join("\n") + "\n");
console.log(`${rows.length - 1} QR codes in ./qr`);
