# 9M2PJU-Generator-Load-Calculator

Offline-ready PWA to size a generator: running kW/kVA, peak with starting surge, loading %, cable ampacity + voltage drop, fuel burn & runtime.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

Service worker requires http(s) — use localhost, not `file://`.

## PWA install

- `manifest.webmanifest` + `sw.js` + `icons/` provide installable, offline-first app.
- Desktop Chrome/Edge: address-bar install icon or **Install App** button in header.
- Android: browser menu → Install / Add to Home Screen.
- iOS Safari: Share → Add to Home Screen.

## Support

If you find this project useful, please consider supporting it: [Donate with PayPal](https://paypal.me/9M2PJU).
