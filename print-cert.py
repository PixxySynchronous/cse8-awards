"""Stamps each student's private QR onto their certificate for printing.

    node qr.mjs && node qrmatrix.mjs && /opt/anaconda3/bin/python -I print-cert.py

Output: print/<id>.jpg (A4 landscape, 300 dpi) and print/all-certificates.pdf.
These carry private keys - never upload them to the website.
"""
import json, os
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
DATA = Path(os.environ.get("DATA_DIR", HERE.parent / "data"))
OUT = HERE / "print"
OUT.mkdir(exist_ok=True)

PAGE = (3508, 2480)            # A4 landscape at 300 dpi
BOX = (2953, 1925, 283)        # x, y, size: 24 mm square at 250 mm, 163 mm from top-left
MOD = 7                        # px per module: 33 modules -> 231 px, centred in the white box
INK = (20, 28, 38)

matrix = json.loads((HERE / "qr" / "matrix.json").read_text())
awards = json.loads((DATA / "awards.json").read_text())

pages = []
for a in awards:
    sid = a["id"]
    cert = Image.open(DATA / "certificates" / f"{sid}.jpg").convert("RGB").resize(PAGE, Image.LANCZOS)
    rows = matrix[sid]
    x, y, size = BOX
    d = ImageDraw.Draw(cert)
    d.rectangle([x, y, x + size - 1, y + size - 1], fill=(255, 255, 255))
    off = (size - len(rows) * MOD) // 2
    for r, row in enumerate(rows):
        for c, bit in enumerate(row):
            if bit == "1":
                px, py = x + off + c * MOD, y + off + r * MOD
                d.rectangle([px, py, px + MOD - 1, py + MOD - 1], fill=INK)
    cert.save(OUT / f"{sid}.jpg", "JPEG", quality=92, dpi=(300, 300))
    pages.append(cert)

pages[0].save(OUT / "all-certificates.pdf", save_all=True, append_images=pages[1:], resolution=300)
print(f"{len(pages)} certificates -> {OUT}")
