# How it works, in plain words

A walk through the whole project without assuming you know the jargon. Paths point to the code.

## 1. What it's built with

- **No framework.** Plain HTML, CSS and JavaScript: a class directory page, a student page and one stylesheet (`public/`).
- **No database.** Everything people add is saved as small files in folders, like a filing cabinet. Each student has a folder `b/<name>/` with three drawers: `photos`, `notes` (one file per note, filed under who wrote it) and `caps` (photo titles). Passwords sit separately in `auth/`.
- **Where it runs.** Vercel serves the pages for free and forwards anything under `/api/` to a small VPS, which handles uploads, notes and passwords (`vercel.json`).
- **Outside code used.** Two packages: `@vercel/blob` to talk to Vercel's storage, and `qrcode` to draw QR codes. The VPS server uses only what's built into Node.
- **Python scripts** prepare the site data, make the QR links and stamp the QR codes onto certificates for printing (`build.py`, `print-cert.py`).

## 2. How the QR key works

Each QR is a link: `https://<site>/<student-name>?k=<12 characters>`.

The 12 characters are not random. They are a **signature**. The server has one secret, mixes it with the student's name using **HMAC-SHA256**, and keeps the first 12 characters (about 72 bits, far too many combinations to guess) (`api/_lib.js` `keyFor`).

- The server never stores a list of keys. It recreates any student's key from the secret when needed.
- Without the secret, nobody can work out the key for a name.
- Checking a scan means recalculating and comparing. The comparison takes the same time whether the first or last character is wrong, so timing leaks nothing (`isStudent`).
- A wrong key just gets the normal visitor view.
- After scanning, the key is wiped from the address bar so a screenshot doesn't leak it.

## 3. What happens on the first scan

The server never records which phone you have. Instead:

1. On the first scan you set a password. The server saves `auth/<your-name>.json` holding a scrambled form of it, never the password itself (`api/claim.js`).
2. Your phone gets a **login token** (24 characters, also a signature), kept in the browser's local storage, so that phone stays logged in.
3. Every upload, note, title or delete checks that token first (`isSession`).

If someone else scans your QR, the page asks them for your password. Without it they can only look.

If two phones claim at the same moment, the password file can only be created once. The first one wins, and the other is told to enter the password instead.

## 4. Passwords and getting back in

- Passwords are 4 to 100 characters, scrambled with **scrypt** (an algorithm made deliberately slow so guessing is expensive) plus a random "salt" per board, so two people with the same password get different stored results.
- After 10 wrong passwords, a board refuses logins for 15 minutes.
- **New phone:** scan the QR again and type the password.
- **Forgot it:** the admin resets the board, which deletes the password file. Photos and notes stay. Because every login token is tied to when that file was created, a reset logs out every phone at once, and the next scan sets a new password.
- **Admin** has a separate key. With it you can see which boards are claimed, reset passwords, and delete any photo or note (`api/admin.js`, `api/delete.js`).

## 5. The storage problem and the move

Vercel's free storage counts three separate things: space (1 GB), simple reads (10,000 a month) and **advanced operations (2,000 a month)**. Listing a folder and saving a file are advanced operations.

Every time someone opened a board, the site asked "list every file in this student's folder" (`api/board.js`). Space used was only about 5 MB, but board views used up the 2,000 operations in three days, and Vercel locked the storage for 30 days.

There was some caching: each board's answer was reused for 2 minutes. But with 54 different boards, most visits found nothing cached. Someone who had just made a change also skipped the cache for 3 minutes so they'd see it.

**After the move to a VPS:**

- Files sit on the server's disk, so listing a folder costs nothing and has no limit.
- **Caddy** serves the photos with HTTPS and tells browsers to keep each photo for a year, since a photo's address never changes. The password folder is never served (`server/Caddyfile`).
- **The trick that made the move easy:** `server/blob-shim` answers the same four calls the code used with Vercel (list, check, save, delete), but on local disk. The API code barely changed, and moving back is just as easy.
- The API runs under **systemd**, restarts itself if it crashes, runs as a limited user that can only write to its data folder, and a daily backup keeps the last 14 days.
- The migration copied every file and kept each one's original upload time, so photos stayed in order and existing logins kept working.

## 6. Numbers

- 54 students, each with a certificate, a QR code and a personal message, and 344 "also won" awards in total.
- 41 of 54 students claimed their board; 229 notes on 46 boards; 41 photos; about 12 MB of stored data.
- There is no visit or scan tracking, so those numbers don't exist.

## 7. Other details

- Photos are shrunk on the phone before upload (1600 px, 82% quality); certificates and backgrounds are pre-shrunk at build time.
- Input limits: notes up to 300 characters with 6 allowed colours, titles up to 60 characters and only for your own photos, uploads JPEG only and under 4 MB, no notes on your own board, and file-path tricks like `../` are refused.
- Everything people type is escaped before it's shown, so nobody can inject code into a page.
- "Share certificate" uses the phone's share sheet and shares the copy without the QR.
- Printed certificates are 300 dpi with the QR at exactly 24 mm in the same spot on every page.
- Not included: automated tests and visit analytics.
