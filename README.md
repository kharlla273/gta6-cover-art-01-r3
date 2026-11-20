# Palm City Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/kharlla273/gta6-cover-art-01-r3/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/kharlla273/gta6-cover-art-01-r3/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns any photo and a caption into GTA-style
multi-panel cover art, exported as a PNG to share. Built for the
[make.fun GTA 6 Cover Art bounty](https://make.fun/c/gta6-cover-art-01).

## What it does

- **Multi-panel posters** — four layouts (Hero + strips, four-panel grid,
  full bleed, triptych) with a white poster frame, a star badge and a
  film-grain finish.
- **Any photo** — load your own photos from your machine, place one per
  panel or fill every panel with a single photo, then drag to reposition
  and scroll to zoom each panel. Nothing is uploaded; everything stays
  in the browser.
- **Caption lettering** — an editable title in condensed Anton display
  type with a sunset-gradient fill, plus a neon script subtitle.
- **Colour grades** — five grades (Vice Sunset, Neon Nights, Teal Heat,
  Golden Hour, Mono Noir) applied as canvas blends over every panel.
- **Post sizes** — one-click PNG export in 1080 × 1080, 1080 × 1350
  and 1920 × 1080.

## Run it

Serve `app/` with any static file server and open `index.html` in
desktop Chrome:

```sh
cd app
python3 -m http.server 8080
```

Then visit http://localhost:8080. No build step, no network requests:
every script, font and sample photo is a file under `app/`.

Three sample photos ship under `app/samples/` so the editor opens
with a finished cover. The display fonts (Anton and Pacifico) are
under `app/fonts/` under the SIL Open Font License (see `OFL.txt`).

## Layout of this repository

- `main.ts` — the entry program: copies `app/` and `screenshots/`
  to the output directory and writes `dossier.json`.
- `app/` — the web app as static files (`index.html`, `style.css`,
  `src/cover.js`, `src/main.js`, `fonts/`, `samples/`).
- `screenshots/` — screenshots of the app and the covers it exports.
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged.

## License

MIT — see [LICENSE](LICENSE). The sample photos were made with an
image model for this entry. Nothing here uses Rockstar Games artwork,
logos or fonts.
