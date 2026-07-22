# 🤝 TapConnect

A **consent-based networking app**. Instead of scanning strangers' faces, everyone
creates their own digital card and shares it via a QR code they control. Point your
camera at someone's code and their social links land in your contacts — no typing,
no awkward "what's your handle?", no privacy problems.

> **Why not face scanning?** Identifying strangers from their face and pulling up
> their socials is illegal in many places (biometric-privacy laws like GDPR, Illinois
> BIPA, Nigeria's NDPR) and is how companies like Clearview AI got fined and banned.
> QR codes give you the same "instant connect" magic with consent built in.

## Features

- **My Card** — enter your name, headline, and social links once. Generates your QR code.
- **Scan** — open the camera, scan someone's TapConnect QR, save them instantly.
- **Contacts** — everyone you've met, with tappable links to their profiles.
- **Private by design** — no servers, no accounts, no tracking. Your card and contacts
  live only in your browser (`localStorage`). Data is shared only when *you* show your code.

Supported links: Instagram, X/Twitter, LinkedIn, TikTok, WhatsApp, Email, Website.

## Run it locally

It's plain HTML/CSS/JS — no build step.

```bash
# from the project folder
python3 -m http.server 8099
# then open http://localhost:8099 in your browser
```

**Camera note:** phone browsers only allow camera access over **HTTPS** (or `localhost`).
For real phone testing, deploy it (see below) or use a tunnel like `ngrok`.

## Deploy (free)

Because it's fully static, you can drop it on any static host:

- **GitHub Pages** — Settings → Pages → deploy from this branch. Done.
- **Netlify / Vercel / Cloudflare Pages** — drag the folder in, or connect the repo.

All of these serve over HTTPS, so the camera scanner works out of the box.

## Project structure

```
index.html   — layout & tabs
styles.css   — styling (dark, mobile-first)
app.js       — profile, QR generation, camera scanning, contacts
vendor/
  qrcode.min.js  — QR code generator (MIT, Kazuhiko Arase)
  jsQR.min.js    — QR code scanner (Apache-2.0)
```

## How the QR exchange works

1. Your profile is packed into a compact JSON object and base64-encoded.
2. It's prefixed with `TAPCONNECT1:` so the scanner only reacts to TapConnect codes.
3. The scanner reads camera frames, decodes any QR with jsQR, and if it's a TapConnect
   payload, saves the contact.

No data ever leaves the device except through the QR code you choose to show.

## Ideas for later

- "Share card" link / Add-to-Apple-Wallet style pass
- Event mode: a shared event code so a whole room can connect
- Export contacts to vCard (`.vcf`) or CSV
- Optional profile photo (a photo *you* upload, not a scan of someone else)
