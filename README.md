# Eighty-Two

A map of the Philippines you stamp as you travel it. Tap a province, it fills in;
the count, the percentage and the island bars keep score. All 82 provinces of the
2023 PSGC list.

No account, no server, no analytics. Your log lives in your own browser.

## Running it

Open `index.html` in a browser. That's the whole thing — two files, no build step,
no dependencies, no network calls.

To serve it locally:

```bash
python3 -m http.server 8000
```

## What it does

- **Stamp provinces** by clicking the map or the list; click again to un-stamp.
- **Pan and zoom** by dragging, scrolling, pinching, or the +/−/FIT buttons.
- **Group the list** by island group (Luzon / Visayas / Mindanao) or by the
  16 administrative regions.
- **Search** the list by name.
- **Name your log** with a nickname — `Abi's` titles it *Abi's PH travel log*,
  on the page, in the browser tab, and on the exported image.
- **Add a photo** to any stamped province — tap it a second time to open it. One
  photo each, picked from this device, kept in this browser and never uploaded.
- **Save an image** — a poster-sized PNG of your map with the count and a date.
- **Save and load a file** — JSON, or a ZIP when there are photos to carry.
- **Clear** the log, asking about stamps and photos separately.

## Files

| File            | What it is                                            |
| --------------- | ----------------------------------------------------- |
| `index.html`    | The whole app — markup, styles and script in one file |
| `provinces.js`  | Province boundaries, polyline-encoded                  |
| `LICENSE`       | MIT                                                    |

## Where the data lives

Everything is in `localStorage`, under these keys:

| Key                  | Holds                                  |
| -------------------- | -------------------------------------- |
| `ph82.visited.v1`    | Stamped provinces, keyed by PSGC code   |
| `ph82.nickname.v1`   | The log's nickname                      |
| `ph82.groupby.v1`    | Island or region grouping               |

Photos live separately, in an IndexedDB database called `ph82-photos` — one
record per province holding a display copy and a thumbnail. The app asks for
persistent storage the first time a photo is added, but a browser short of room
can still discard them, so the export is the only real backup.

Browser storage is per-origin, so a log does not follow the page from `file://`
to a web address, or between domains. Use **Save file** to move one.

## Versioning

The app version lives in one place, `APP_VERSION` near the top of the script in
`index.html`. It shows in the About sheet and is written into every saved JSON
file as `appVersion`.

[Semantic versioning](https://semver.org): patch for fixes, minor for features,
major for a change that breaks saved files. To release, bump `APP_VERSION` and
add an entry to the log below.

Note that the `version: 1` field in saved files is a *file-format* number, not
the app version. Bump it only when the shape of the JSON changes in a way older
files would not satisfy.

## Log

### 1.1.0 — 2026-08-30

- Added: one photo per province, held on the device in IndexedDB and never
  uploaded. Tap a stamped province to open it, add, replace or remove the photo,
  or take the stamp off. Provinces holding a photo carry a dot in the list and a
  tag in the map readout.
- Added: photos are downscaled on the way in (1600px display copy, 320px
  thumbnail) by re-encoding through a canvas, which also strips EXIF — so
  location and camera data never reach an exported file.
- Changed: **Save file** writes a ZIP (`log.json` plus `images/`) when there are
  photos, and a plain `.json` when there are none. **Load file** reads both; a ZIP
  replaces the photos, a bare `.json` leaves them alone.
- Changed: tapping a stamped province on the map now opens it instead of
  un-stamping. Un-stamping moved into that sheet, and the list rows still toggle.
- Changed: **Clear** is an in-page dialog that asks about stamps and photos
  separately, rather than a browser confirm.

### 1.0.1 — 2026-08-30

- Added: app versioning. `APP_VERSION` shows in the About sheet and is written
  into every saved file as `appVersion`.
- Added: this README.
- Fixed: clicking a province on desktop did not stamp it. Capturing the pointer
  retargets the click to the SVG root, so the province is now resolved from the
  cursor position rather than from the event target.
- Fixed: the hint text in the bottom-left corner swallowed clicks on any
  province panned underneath it.

### 1.0.0 — 2026-08-29

First release.

- Stamp provinces from the map or the list, with pan, zoom and search.
- Group the list by island group or by region.
- Name a log with a nickname, which titles the page and the exported image.
- Save the map as a PNG poster, with the count, island breakdown and date.
- Save and load logs as JSON.
- A How to use section in the About sheet.
- Serif wordmark and counter.

## License

MIT — see `LICENSE`.

## Credits

Province boundaries from
[faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps),
used under the MIT License, simplified to roughly one kilometre of detail. The
permission notice is retained at the top of `provinces.js`.

Boundaries are illustrative, approximate, and take no position on territorial or
maritime claims. **Not for navigation, legal, or any official purpose.**
