# StampLogs

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

- **Stamp provinces** from the list with a click, or by tapping one on the map to
  open its panel and stamping it there.
- **Pan and zoom** by dragging, scrolling, pinching, or the +/−/FIT buttons.
- **Group the list** by island group (Luzon / Visayas / Mindanao) or by the
  16 administrative regions.
- **Search** the list by name.
- **Name your log** with a nickname — `Abi's` titles it *Abi's PH travel log*,
  on the page, in the browser tab, and on the exported image.
- **Date a trip** on any province, stamped or not — a day you *traveled*, or a day
  you have *planned*. Planned provinces are drawn in clay, and can be hidden.
- **Add a photo** to any stamped province — open it and add one. One photo each,
  picked from this device, kept in this browser and never uploaded.
- **Save an image** — a poster-sized PNG of your map with the count and a date.
- **Save and load a file** — JSON, or a ZIP when there are photos to carry.
  Saved files are named `nickname-stamplogs-date`, or `stamplogs-date` when the
  log has no nickname.
- **Clear** the log, asking about stamps, dates and photos separately.

## Files

| File            | What it is                                            |
| --------------- | ----------------------------------------------------- |
| `index.html`    | The whole app — markup, styles and script in one file |
| `provinces.js`  | Province boundaries, polyline-encoded                  |
| `LICENSE`       | MIT                                                    |

## Where the data lives

Everything is in `localStorage`, under these keys:

| Key                       | Holds                                   |
| ------------------------- | --------------------------------------- |
| `stamplogs.visited.v1`    | Stamped provinces, keyed by PSGC code   |
| `stamplogs.nickname.v1`   | The log's nickname                      |
| `stamplogs.groupby.v1`    | Island or region grouping               |
| `stamplogs.trips.v1`      | Trip dates, each with `date` and `kind` |
| `stamplogs.showplanned.v1`| Whether planned provinces are drawn     |

Photos live separately, in an IndexedDB database called `stamplogs-photos` — one
record per province holding a display copy and a thumbnail.

These were named `ph82.*` and `ph82-photos` when the app was called Eighty-Two. A
log written under the old names is copied across the first time this version runs,
and the originals are left where they are — nothing is deleted. The one-time copy
is recorded in `stamplogs.migrated.v1` and `stamplogs.photos.migrated.v1`.

The app asks for persistent storage the first time a photo is added, but a browser
short of room can still discard them, so the export is the only real backup.

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

### 1.3.0 — 2026-09-06

- Changed: the app is now called **StampLogs** — the page title, the wordmark, the
  browser tab, the heading on the saved poster and the `app` field in saved files.
  It was Eighty-Two before.
- Changed: saved files are named `nickname-stamplogs-date`, or `stamplogs-date`
  when the log has no nickname. The extension tells the map from the log, so the
  `-log-` and `-map-` parts of the old names are gone.
- Changed: local storage keys are now `stamplogs.*` and the photo database is
  `stamplogs-photos`; they were `ph82.*` and `ph82-photos`. A log written under
  the old names is copied across the first time this version runs, and the
  originals are left in place, so nothing is lost and an older copy of the page
  still opens them. The one-time copy is recorded in `stamplogs.migrated.v1` and
  `stamplogs.photos.migrated.v1`.
- Changed: the province data globals are `window.STAMPLOGS` and
  `window.STAMPLOGS_ALPHABET`, formerly `window.PH82` and `window.PH82_ALPHABET`.

Saved files are unaffected: the file format stays at `version: 1`, and a file
written by an earlier release still loads.

### 1.2.0 — 2026-09-05

- Added: a date for every province, stamped or not, kept in `ph82.trips.v1` apart
  from the stamp date — which stays what it has always been, the day the stamp
  went on. Each date is either **Traveled** or **Planned**; an unstamped province
  starts on **Planned**, so a trip can be laid out before you go. Taking a stamp
  off leaves the date alone; emptying the field clears it.
- Added: a province dated ahead but not yet stamped is drawn in clay on the map,
  ticked in clay in the list, and named in the map readout. Stamping it turns it
  green — the stamp is the truer thing to say, so it wins.
- Added: **Show planned provinces** in the sidebar, counting what is dated ahead
  and deciding whether plans are drawn at all — on the map, in the list and on the
  saved image. The dates themselves are untouched either way, and the switch is
  remembered in `ph82.showplanned.v1`.
- Added: the saved poster carries a planned count under the island breakdown when
  plans are being shown.
- Changed: tapping any province on the map now opens its panel — an unstamped one
  no longer stamps on contact. **Stamp this province** sits in the panel, and
  un-stamping now leaves the panel open. List rows still toggle on a click.
- Changed: saved files carry `tripDate` and `tripKind`, and now include provinces
  that hold only a date, marked `stamped: false`. The file format stays at
  `version: 1` — older files have no such rows, so every row in one still stamps.
  `count` is the number stamped, as before.
- Changed: **Clear** asks about stamps, dates and photos separately.

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
