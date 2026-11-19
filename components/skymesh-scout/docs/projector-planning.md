# AegisNet / SkyMesh Scout — Projector Mode Planning

**Prototype 4.2 · Future product experience layer**

This document plans the projector display modes. Implementation is deferred until deployment work is complete. The projector is the "why someone wants this on their property" feature — the living room demo that makes the device visually compelling.

## Inspiration

- [Skylight (cpaczek)](https://github.com/cpaczek/skylight): Open-source project that decodes ADS-B from RTL-SDR and projects aircraft onto a ceiling with star field, constellations, ISS, and moon overlays. This is the closest existing reference.
- The current P3 projector canvas works but renders aircraft as labeled blobs — not a sky view.

## Planned display modes

### 1. Sky Mode (ceiling)
- Dark background with rendered star field (static or live from a star catalog)
- Aircraft rendered as aircraft silhouettes moving across the sky
- Aircraft speed and direction matched to real data
- Altitude color-coded: low GA aircraft warm amber, high commercial cool blue
- Aircraft label: callsign, altitude, type
- Optional: Moon position (from ephemeris)
- Optional: ISS pass (from open API)
- Optional: Satellite constellation overlay

**Data:** Live ADS-B from readsb. Fall back to online sources. Label all data with source and quality.

### 2. Wall Map Mode
- Tactical radar-style flat map, sized for a wall
- Aircraft, vessels, and team nodes plotted
- Filters by source and type
- Distance rings and compass rose
- Team node pins with callsigns
- Alert highlight when an aircraft triggers a threshold

**Data:** All tracked entities from TrackingRouter.

### 3. Mission Briefing Mode
- Text-heavy display for team briefings
- Current aircraft sorted by distance
- Team node status
- Mesh connectivity summary
- Active alert profile
- Last incident log entries
- MQTT / route status

**Data:** All live system state.

### 4. Night / Camp Mode
- All displays dimmed to very low brightness
- Warm amber tones instead of bright cyan/white
- Minimal text, large aircraft icons only
- Suitable for use in a tent or dark room

### 5. Living Room / Demo Mode
- Auto-cycles between Sky Mode and Wall Map Mode every 60 seconds
- Shows the most visually interesting aircraft overhead
- Clean branding strip at the bottom
- "What's that plane?" one-touch callout on the nearest aircraft

## Technical approach

The projector canvas already exists (`projCanvas` in pages.js). The upgrade is:

1. Replace the current blob rendering with proper aircraft silhouettes (SVG paths or canvas paths)
2. Add a star field using a simple procedural or catalog-based renderer
3. Map aircraft lat/lon to screen coordinates using an azimuthal equidistant projection centered on rxLat/rxLon
4. Add the ISS pass overlay via `api.wheretheiss.at` (free, no key)
5. Add optional moon phase indicator via a simple ephemeris calculation (no API needed)

## Live vs simulated data

| Element | Source | Quality label |
|---|---|---|
| Aircraft | readsb / ADSBx / FR24 | Live / Delayed / Demo |
| Vessels | AIS / demo | Live / Demo |
| Team nodes | Meshtastic MQTT | Live / Cached |
| Stars | Static catalog | Static |
| ISS | wheretheiss.at API | Live |
| Moon | Browser ephemeris | Calculated |

All data sources will show a quality badge on-screen. Simulated data will be clearly labeled.

## What not to claim

- Do not claim the projector provides real-time certified traffic data
- Do not claim the star field is astronomically precise
- Do not claim ISS position is exact (it's approximate)
- Label the entire display as situational awareness only

## Build priority

Projector mode is deferred until:
1. The installer and setup wizard are deployed on real hardware
2. The NJ–AZ bridge test is complete
3. At least two property nodes are running

The current projector canvas is functional enough for demos. The visual upgrade is the next major product experience investment.
