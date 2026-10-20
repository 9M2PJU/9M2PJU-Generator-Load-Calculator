# 9M2PJU Generator Load Calculator

Size a generator in seconds: enter generator rating, loads, cable and fuel —
get running kW/kVA, peak demand with starting surge, loading %, cable check,
voltage drop and fuel runtime. Installable, offline-ready PWA.

**Live:** https://generator.hamradio.my

## Features

- **Generator sizing** — type (diesel / petrol / gas / inverter), kVA rating, power factor
- **Loads** — presets (lighting, sockets, office, fridge, air-cond, pump, motor, custom)
  with quantity, unit watts and starting-surge factor; duplicate and quick-add
- **Live results** — running kW/kVA, peak kW/kVA, peak loading gauge, no Calculate press needed
- **Cable check** — copper/aluminium, 1-phase 230 V / 3-phase 400 V, length,
  ampacity utilisation and voltage-drop estimate
- **Fuel runtime** — available fuel vs. burn rate (manual or auto-estimated from fuel type)
- **PWA** — install to home screen / desktop, works offline via service worker
- **Extras** — dark mode, copy / share / print summary, reset, autosave to localStorage,
  responsive mobile layout with sticky results bar

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

> Service workers require `http(s)` — use localhost, not `file://`.

## Install as app (PWA)

- **Desktop (Chrome/Edge):** install icon in the address bar, or the
  **⬇ Install App** button in the header
- **Android:** browser menu → Install / Add to Home Screen
- **iOS Safari:** Share → Add to Home Screen

Offline support is provided by `sw.js` (cache-first app shell).

## How calculations work

| Quantity | Formula |
|---|---|
| Apparent power | `S (kVA) = P (kW) / PF` — applied to running and peak |
| Loading | `load % = S_load / S_gen × 100` (peak for sizing, running for fuel) |
| Current, 1-ph | `I = P / (V × PF)`, `V = 230 V` |
| Current, 3-ph | `I = P / (√3 × V_LL × PF)`, `V_LL = 400 V` |
| Volt drop, 1-ph | `Vd = 2 × I × ρ × L / A` |
| Volt drop, 3-ph | `Vd = √3 × I × ρ × L / A` (ρ Cu 0.0172, Al 0.0282 Ω·mm²/m) |
| Fuel @100 % (auto) | `burn = kVA × PF × L/kWh` (diesel 0.25, petrol 0.35, gas 0.30, inverter 0.23) |
| Fuel @running | `burn × load fraction` (linear with load) |
| Runtime | `hours = fuel (L) / burn @running (L/h)` |

Verified against hand calculations, e.g. 5 kW run / 8 kW peak on 10 kVA PF 0.8:
6.25 kVA run, 10.0 kVA peak (100 %), 27.17 A @1-ph, 9.02 A @3-ph,
4.67 V (2.03 %) drop on 20 m 4 mm² Cu, 2.00 L/h @100 % → 32 h on 40 L.

**Simplifications (read before relying on results):**

- Ampacity is rule-of-thumb for a typical single run; derating (ambient,
  grouping, conduit, installation method) is not modelled.
- Voltage drop is resistive-only; reactance and temperature effects ignored.
- Peak kVA uses running PF; motor starting PF is lower, so true starting kVA
  can be higher than shown.
- Fuel burn scales linearly with load; real sets burn ~20–30 % even lightly
  loaded, so light-load runtime is optimistic.
- Always verify against local wiring codes (e.g. Suruhanjaya Tenaga / IEC 60364)
  and the generator manufacturer's datasheet.

## Project structure

```text
index.html              App shell and UI
styles.css              Design system (light/dark, responsive)
app.js                  Calculator logic, PWA install, persistence
manifest.webmanifest    PWA manifest
sw.js                   Offline service worker
icons/                  App icons (192/512, maskable, favicon)
CNAME                   Custom domain for GitHub Pages
```

## Support

If this project saves you a site visit, consider buying the maintainer a coffee —
it keeps the repeater lights on. Thank you! 🙏

<a href="https://paypal.me/9M2PJU">
  <img src="https://img.shields.io/badge/Donate-PayPal-0070BA?style=for-the-badge&logo=paypal&logoColor=white" alt="Donate with PayPal" />
</a>

Prefer a direct link? [paypal.me/9M2PJU](https://paypal.me/9M2PJU)

## Credits

Made for 🇲🇾 by [9M2PJU](https://hamradio.my).
