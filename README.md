# @tidepool/uploader-common

Shared modules for turning diabetes device data into Tidepool data model
records, extracted from the [Tidepool Uploader](https://github.com/tidepool-org/uploader)
so that device drivers can run outside of it (e.g. the Tandem cloud driver).

| module | purpose |
|---|---|
| `struct` | pack/unpack binary structures with a printf-like format string |
| `TimezoneOffsetUtil` | "Bootstrapping to UTC": derives UTC times from device times and the device's time-change history |
| `eventAnnotations` | annotate data model records (`annotateEvent`, `isAnnotated`) |
| `commonFunctions` | shared driver helpers: final scheduled basal, duration updates across uploads, unit conversion |
| `objectBuilder` | builders for Tidepool data model records (`makeCBG()`, `makeNormalBolus()`, …) |
| `crc` | CRC-16 tables and calculators used by several drivers |

```js
const builder = require('@tidepool/uploader-common/objectBuilder')();
const struct = require('@tidepool/uploader-common/struct')();
```

Modules are CommonJS. `commonFunctions.updatePreviousDurations(data, cfg, cb)` expects the
platform API on `cfg.api` (`getLatestRecord`); everything else is pure. The records it updates have
no `id`, as the Uploader uploads them as new records, unless `cfg.keepUpdatedRecordIds` is set: then
they keep the `id` of the record they update, for a client that replaces it.

The Uploader depends on this package and re-exports each module from its `lib/` so that
existing relative imports keep working.

## Tests

```
npm install
npm test
```

## Releasing

Bump `version` in `package.json` (exact versions are pinned by consumers) and `npm publish`.
