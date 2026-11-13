// writes qr/matrix.json: id -> QR module rows (for print-cert.py)
import { readFileSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
const out = {};
for (const line of readFileSync("qr/links.csv", "utf8").trim().split("\n").slice(1)) {
  const id = line.split(",")[0], link = line.split(",").pop();
  const m = QRCode.create(link, { errorCorrectionLevel: "M" }).modules;
  out[id] = Array.from({ length: m.size }, (_, r) => Array.from({ length: m.size }, (_, c) => m.get(r, c) ? 1 : 0).join(""));
}
writeFileSync("qr/matrix.json", JSON.stringify(out));
console.log(Object.keys(out).length, "matrices, size", Object.values(out)[0].length);
