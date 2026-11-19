/* ============================================================
   AegisNet P4.4 — sky-projector.js
   Full ceiling projection engine.
   Replaces the blob canvas in projector mode.

   Features:
   - Procedural star field with magnitude simulation
   - Constellation line overlay (major Western constellations)
   - Moon position from browser ephemeris calculation
   - ISS live position via open API (no key required)
   - Aircraft silhouettes with smooth interpolated motion
   - Vessel and team node pins
   - Altitude color coding
   - Night / camp / briefing / wall map display modes
   - All data clearly labeled: live | delayed | simulated

   Data notice:
   Aircraft from ADS-B or demo feed.
   ISS from wheretheiss.at (free, no key).
   Moon from browser ephemeris (approximate).
   Stars from built-in procedural catalog.
   ============================================================ */
"use strict";

/* ══════════════════════════════════════════════
   STAR CATALOG (procedural — bright named stars)
   [ra_deg, dec_deg, magnitude, name]
   Subset of Hipparcos bright stars for visual accuracy.
══════════════════════════════════════════════ */
const NAMED_STARS = [
  [101.29, -16.72, -1.46, "Sirius"],    [95.99,  7.41,  0.45, "Betelgeuse"],
  [78.63, 45.99,   0.08, "Capella"],    [213.92,-60.83,  0.01, "Hadar"],
  [297.70, 8.87,   0.77, "Altair"],     [310.36, 45.28,  1.25, "Deneb"],
  [116.33,28.03,   1.14, "Pollux"],     [113.65,31.89,   1.58, "Castor"],
  [88.79, 7.41,    0.18, "Rigel"],      [84.05,-1.20,    1.69, "Mintaka"],
  [279.23,38.78,   0.03, "Vega"],       [247.35,-26.43,  1.09, "Antares"],
  [191.93,-59.69,  0.77, "Acrux"],      [83.82,-5.91,    1.74, "Alnitak"],
  [152.09,11.97,   1.98, "Regulus"],    [68.98, 16.51,   0.87, "Aldebaran"],
  [114.83,-26.0,   -0.72,"Canopus"],    [6.57,  2.09,    2.04, "Mira"],
  [344.41,-29.62,  1.16, "Fomalhaut"],  [37.95, 89.26,   2.02, "Polaris"],
];

/* ══════════════════════════════════════════════
   CONSTELLATION LINE DATA
   [star_ra1, dec1, star_ra2, dec2] pairs
   Major visible constellations (simplified)
══════════════════════════════════════════════ */
const CONSTELLATION_LINES = [
  // Orion
  [88.79,7.41,  84.05,-1.20],  [84.05,-1.20, 83.82,-5.91],
  [88.79,7.41,  95.99,7.41],   [95.99,7.41,  94.31,22.51],
  // Big Dipper (Ursa Major, simplified)
  [165.93,61.75, 183.86,57.03], [183.86,57.03, 193.51,55.96],
  [193.51,55.96, 206.89,49.31], [206.89,49.31, 210.96,54.93],
  // Cassiopeia (W shape)
  [13.16,56.54, 21.45,59.15],  [21.45,59.15, 28.60,63.67],
  [28.60,63.67, 40.97,60.72],  [40.97,60.72, 56.62,66.34],
];

/* ══════════════════════════════════════════════
   EPHEMERIS HELPERS
   Approximate moon and sun position.
   Good to ~1 degree, sufficient for visual overlay.
══════════════════════════════════════════════ */
function julianDate(d) {
  return (d.getTime() / 86400000) + 2440587.5;
}
function moonPosition(d) {
  const jd = julianDate(d);
  const T = (jd - 2451545.0) / 36525;
  // Mean longitude and anomaly
  const L = (218.316 + 13.176396 * (jd - 2451545.0)) % 360;
  const M = (134.963 + 13.064993 * (jd - 2451545.0)) % 360;
  const F = (93.272  + 13.229350 * (jd - 2451545.0)) % 360;
  const Mr = M * Math.PI / 180;
  const Fr = F * Math.PI / 180;
  // Approximate ecliptic longitude and latitude
  const lon = L + 6.289 * Math.sin(Mr);
  const lat = 5.128 * Math.sin(Fr);
  // Convert to RA/Dec (approximate, J2000 ecliptic obliquity 23.439°)
  const e = 23.439 * Math.PI / 180;
  const lonR = lon * Math.PI / 180;
  const latR = lat * Math.PI / 180;
  const ra  = Math.atan2(Math.sin(lonR)*Math.cos(e) - Math.tan(latR)*Math.sin(e), Math.cos(lonR)) * 180 / Math.PI;
  const dec = Math.asin(Math.sin(latR)*Math.cos(e) + Math.cos(latR)*Math.sin(e)*Math.sin(lonR)) * 180 / Math.PI;
  // Rough phase (0=new, 0.5=full)
  const phase = (1 - Math.cos((lon - (280.46 + 0.9856474*(jd-2451545))) * Math.PI/180)) / 2;
  return { ra: (ra + 360) % 360, dec, phase };
}

/* ── map RA/Dec to screen azimuth/altitude for a given lat/lon/time ── */
function raDecToAltAz(ra, dec, lat, lon, d) {
  const jd = julianDate(d);
  // Greenwich Mean Sidereal Time
  const T  = (jd - 2451545.0) / 36525;
  const gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0)
               + 0.000387933 * T * T) % 360;
  const lst  = (gmst + lon + 360) % 360;
  const ha   = ((lst - ra) + 360) % 360;  // hour angle in degrees
  const haR  = ha  * Math.PI / 180;
  const decR = dec * Math.PI / 180;
  const latR = lat * Math.PI / 180;
  const alt = Math.asin(Math.sin(decR)*Math.sin(latR) + Math.cos(decR)*Math.cos(latR)*Math.cos(haR));
  const az  = Math.atan2(-Math.cos(decR)*Math.sin(haR),
                          Math.sin(decR)*Math.cos(latR) - Math.cos(decR)*Math.sin(latR)*Math.cos(haR));
  return { alt: alt * 180/Math.PI, az: (az * 180/Math.PI + 360) % 360 };
}

/* ── project az/alt onto canvas (azimuthal equidistant, centered on zenith) ── */
function projectToCanvas(az, alt, cx, cy, radius) {
  if (alt < 0) return null;   // below horizon
  const r = radius * (1 - alt / 90);
  const azR = az * Math.PI / 180;
  return {
    x: cx + r * Math.sin(azR),
    y: cy - r * Math.cos(azR)
  };
}

/* ══════════════════════════════════════════════
   ISS TRACKER
   Uses wheretheiss.at — free, no API key
══════════════════════════════════════════════ */
const ISS = { lat: null, lon: null, alt: 0, lastFetch: 0 };
async function fetchISS() {
  if (Date.now() - ISS.lastFetch < 10000) return;
  ISS.lastFetch = Date.now();
  try {
    const r = await fetch("https://api.wheretheiss.at/v1/satellites/25544", { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return;
    const j = await r.json();
    ISS.lat = j.latitude; ISS.lon = j.longitude; ISS.alt = j.altitude;
  } catch {}
}

/* ══════════════════════════════════════════════
   AIRCRAFT SMOOTH INTERPOLATION
   Smooths jerky 2-second position updates
══════════════════════════════════════════════ */
const _acSmooth = {};   // hex -> {lat, lon, heading, lastTs}
function smoothAC(ac) {
  const now = Date.now();
  const prev = _acSmooth[ac.id];
  if (!prev) {
    _acSmooth[ac.id] = { lat: ac.lat, lon: ac.lon, heading: ac.heading || 0, lastTs: now };
    return ac;
  }
  // Exponential smoothing α=0.25 — reduces jitter while keeping responsiveness
  const α = 0.25;
  prev.lat     = prev.lat + α * (ac.lat - prev.lat);
  prev.lon     = prev.lon + α * (ac.lon - prev.lon);
  prev.heading = prev.heading + α * (((ac.heading - prev.heading + 540) % 360) - 180);
  prev.lastTs  = now;
  return { ...ac, lat: prev.lat, lon: prev.lon, heading: prev.heading };
}

/* ══════════════════════════════════════════════
   MAIN PROJECTOR ENGINE
══════════════════════════════════════════════ */
window.SkyProjector = (function() {
  let _canvas = null;
  let _mode   = "ceiling";   // ceiling | wall | briefing | camp | night
  let _running = false;
  let _overheadRangeNm = null;
  let _rxLat  = 34.615;
  let _rxLon  = -112.45;
  let _showStars       = true;
  let _showConstellations = true;
  let _showMoon        = true;
  let _showISS         = true;
  let _showAircraft    = true;
  let _showVessels     = true;
  let _showTeamNodes   = true;
  let _stars = [];    // pre-generated procedural field

  /* ── generate procedural star field ── */
  function _genStars(count = 800) {
    const s = [];
    for (let i = 0; i < count; i++) {
      s.push({
        az:  Math.random() * 360,
        alt: Math.pow(Math.random(), 0.5) * 90,  // bias toward horizon
        mag: Math.random() * 5 + 0.5,            // magnitude 0.5–5.5
        twinkle: Math.random()
      });
    }
    // Add named stars at approximate visual positions
    for (const [ra, dec, mag, name] of NAMED_STARS) {
      s.push({ ra, dec, mag, name, named: true });
    }
    return s;
  }
  _stars = _genStars();

  /* ── star alpha based on magnitude and dimFactor ── */
  function _starAlpha(mag, dim) {
    const base = Math.max(0.05, (6 - mag) / 5.5);
    return base * dim;
  }

  /* ── aircraft silhouette path (generic airliner shape) ── */
  function _drawAircraftSilhouette(ctx, x, y, heading, scale, color, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading * Math.PI / 180);
    if (glow > 0.5) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 8 * glow;
    }
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.max(0.4, glow);
    // Fuselage
    ctx.beginPath();
    ctx.ellipse(0, 0, scale * 0.6, scale * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    ctx.beginPath();
    ctx.moveTo(-scale * 2.8, scale * 0.3);
    ctx.lineTo(scale * 2.8,  scale * 0.3);
    ctx.lineTo(scale * 1.8,  scale * 0.7);
    ctx.lineTo(-scale * 1.8, scale * 0.7);
    ctx.closePath();
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(-scale * 0.9, -scale * 1.6);
    ctx.lineTo(scale * 0.9,  -scale * 1.6);
    ctx.lineTo(scale * 0.5,  -scale * 2.2);
    ctx.lineTo(-scale * 0.5, -scale * 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /* ── ship icon ── */
  function _drawShipIcon(ctx, x, y, heading, scale, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading * Math.PI / 180);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(0, -scale * 2);
    ctx.lineTo(scale * 1.2, scale * 1.5);
    ctx.lineTo(-scale * 1.2, scale * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ── data quality label ── */
  function _qualityLabel(source) {
    if (!source || source === "DEMO") return "SIMULATED";
    if (source === "LOCAL·1090" || source === "AISHub") return "LIVE";
    return "DELAYED";
  }

  /* ── main draw loop ── */
  function _draw(ts) {
    if (!_running) return;
    requestAnimationFrame(_draw);
    if (!_canvas) return;
    const ctx   = _canvas.getContext("2d");
    const w     = _canvas.clientWidth || _canvas.width;
    const h     = _canvas.clientHeight || _canvas.height;
    if (_canvas.width !== w || _canvas.height !== h) { _canvas.width = w; _canvas.height = h; }

    const cx = w / 2, cy = h / 2;
    const radius = Math.min(cx, cy) * 0.92;
    const now    = new Date();

    /* mode config */
    const isCamp   = _mode === "camp";
    const isWall   = _mode === "wall";
    const isBrief  = _mode === "briefing";
    const dimF     = isCamp ? 0.22 : 1;
    const bgColor  = isCamp ? "#050304" : "#000008";
    const acColor  = (alt) => alt < 8000
      ? (isCamp ? "#6B3A08" : "#F0B541")
      : (isCamp ? "#0D2A3A" : "#62D9F7");

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    /* ─ horizon circle (subtle) ─ */
    if (!isWall) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isCamp ? "rgba(80,50,20,.15)" : "rgba(40,70,90,.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* ─ stars ─ */
    if (_showStars && !isWall && !isBrief) {
      const twinklePhase = ts / 3000;
      for (const s of _stars) {
        let pos;
        if (s.named) {
          const aa = raDecToAltAz(s.ra, s.dec, _rxLat, _rxLon, now);
          pos = projectToCanvas(aa.az, aa.alt, cx, cy, radius);
        } else {
          pos = projectToCanvas(s.az, s.alt, cx, cy, radius);
        }
        if (!pos) continue;
        const twinkle = 1 + 0.18 * Math.sin(twinklePhase * 2.1 + s.twinkle * 12);
        const alpha = _starAlpha(s.mag, dimF) * twinkle;
        if (alpha < 0.02) continue;
        const r = Math.max(0.5, (4.5 - s.mag) / 2.2);
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.fillStyle = isCamp ? "#8B7060" : "#D8E8F0";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (s.named && s.mag < 2) {
          ctx.globalAlpha = alpha * 0.6;
          ctx.font = "9px 'IBM Plex Mono'";
          ctx.fillStyle = isCamp ? "#6B5040" : "#8AAABB";
          ctx.textAlign = "left";
          ctx.fillText(s.name, pos.x + r + 2, pos.y + 3);
        }
      }
      ctx.globalAlpha = 1;
    }

    /* ─ constellation lines ─ */
    if (_showConstellations && !isWall && !isBrief && !isCamp) {
      ctx.strokeStyle = "rgba(60,100,130,.25)";
      ctx.lineWidth = 0.7;
      for (const [ra1,dec1,ra2,dec2] of CONSTELLATION_LINES) {
        const p1 = projectToCanvas(...Object.values(raDecToAltAz(ra1,dec1,_rxLat,_rxLon,now)), cx, cy, radius);
        const p2 = projectToCanvas(...Object.values(raDecToAltAz(ra2,dec2,_rxLat,_rxLon,now)), cx, cy, radius);
        if (!p1 || !p2) continue;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    /* ─ moon ─ */
    if (_showMoon && !isWall && !isBrief) {
      const moon = moonPosition(now);
      const mAA  = raDecToAltAz(moon.ra, moon.dec, _rxLat, _rxLon, now);
      const mPos = projectToCanvas(mAA.az, mAA.alt, cx, cy, radius);
      if (mPos) {
        const mR   = 14 * dimF;
        const grad = ctx.createRadialGradient(mPos.x - mR*0.3, mPos.y - mR*0.3, 1, mPos.x, mPos.y, mR);
        grad.addColorStop(0, isCamp ? "rgba(180,150,110,.7)" : "rgba(240,235,220,.85)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.7 * dimF;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mPos.x, mPos.y, mR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.55 * dimF;
        ctx.font = "10px 'IBM Plex Mono'";
        ctx.fillStyle = isCamp ? "#A0907A" : "#C8C0B0";
        ctx.textAlign = "center";
        ctx.fillText("MOON", mPos.x, mPos.y + mR + 12);
        ctx.globalAlpha = 1;
      }
    }

    /* ─ ISS ─ */
    fetchISS();
    if (_showISS && ISS.lat != null && !isWall && !isBrief) {
      const issAzAlt = raDecToAltAz(ISS.lon, ISS.lat, _rxLat, _rxLon, now);
      const issPos   = projectToCanvas(issAzAlt.az, Math.max(0, issAzAlt.alt + 15), cx, cy, radius);
      if (issPos) {
        ctx.globalAlpha = 0.8 * dimF;
        ctx.fillStyle = isCamp ? "#4A4A2A" : "#F0E860";
        ctx.beginPath();
        ctx.arc(issPos.x, issPos.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "9px 'IBM Plex Mono'";
        ctx.fillStyle = isCamp ? "#6B6A30" : "#D8D040";
        ctx.textAlign = "left";
        ctx.fillText("ISS ·LIVE", issPos.x + 8, issPos.y + 3);
        ctx.globalAlpha = 1;
      }
    }

    /* ─ aircraft (overhead only, within configured range) ─ */
    const OVERHEAD_RANGE_NM = 25;  // only show aircraft within this range
    const aircraft = window._scopeData?.aircraft || window._lastData?.aircraft || [];
    const CEIL_RANGE = _overheadRangeNm || 25;
    const WALL_RANGE = _overheadRangeNm ? _overheadRangeNm * 1.5 : 40;

    if (_showAircraft) {
      for (const rawAC of aircraft) {
        const ac  = smoothAC(rawAC);
        if (!ac.lat || !ac.lon) continue;
        const rng = window.GEO?.haversineNm?.(_rxLat, _rxLon, ac.lat, ac.lon) ?? 999;
        const maxR = isWall ? WALL_RANGE : CEIL_RANGE;
        if (rng > maxR) continue;   // only show overhead aircraft

        let pos;
        if (isWall) {
          const scale = Math.min(w, h) / 2 / WALL_RANGE;
          const brg   = window.GEO?.bearingDeg?.(_rxLat, _rxLon, ac.lat, ac.lon) ?? 0;
          pos = { x: cx + Math.sin(brg * Math.PI/180) * rng * scale,
                  y: cy - Math.cos(brg * Math.PI/180) * rng * scale };
        } else {
          // Ceiling: map bearing to screen, altitude determines elevation angle
          const brg    = window.GEO?.bearingDeg?.(_rxLat, _rxLon, ac.lat, ac.lon) ?? 0;
          const altFt  = ac.altitude || 5000;
          // Higher aircraft appear closer to zenith (centre), lower appear near horizon
          const elevDeg = Math.min(88, Math.max(10, 90 - rng * (altFt > 10000 ? 1.5 : 2.5)));
          pos = projectToCanvas(brg, elevDeg, cx, cy, radius);
        }
        if (!pos) continue;

        const color   = acColor(ac.altitude || 0);
        const glow    = rng < 5 ? 1 : rng < 15 ? 0.8 : 0.55;
        const acScale = isCamp ? 5 : (rng < 10 ? 9 : 7);

        _drawAircraftSilhouette(ctx, pos.x, pos.y, ac.heading || 0, acScale, color, glow);

        if (!isCamp && !isBrief) {
          // Clean label: callsign on one line, altitude + range on second line
          ctx.globalAlpha = Math.max(0.5, glow);
          const labelSize = isWall ? 11 : 13;
          ctx.font = `700 ${labelSize}px 'Rajdhani'`;
          ctx.textAlign = "center";
          ctx.fillStyle = color;
          const callsign = (ac.name || ac.callsign || "—").slice(0, 9).trim();
          ctx.fillText(callsign, pos.x, pos.y + acScale * 2.6);
          ctx.font = "10px 'IBM Plex Mono'";
          ctx.fillStyle = "rgba(140,170,180,.75)";
          ctx.fillText(
            Math.round((ac.altitude||0)/100)*100 >= 1000
              ? (Math.round((ac.altitude||0)/100)/10).toFixed(1) + "k ft · " + rng.toFixed(0) + "nm"
              : Math.round(ac.altitude||0).toLocaleString() + "ft · " + rng.toFixed(0) + "nm",
            pos.x, pos.y + acScale * 2.6 + 13
          );
          ctx.globalAlpha = 1;
        }
      }
    }

    /* ─ vessels (wall mode) ─ */
    const vessels = window._scopeData?.ship || window._lastData?.ships || [];
    if (_showVessels && isWall) {
      const scale = Math.min(w, h) / 2 / 30;
      for (const v of vessels) {
        if (!v.lat || !v.lon) continue;
        const rng = window.GEO?.haversineNm?.(_rxLat, _rxLon, v.lat, v.lon) ?? 999;
        if (rng > 30) continue;
        const brg = window.GEO?.bearingDeg?.(_rxLat, _rxLon, v.lat, v.lon) ?? 0;
        const pos = { x: cx + Math.sin(brg * Math.PI/180) * rng * scale,
                      y: cy - Math.cos(brg * Math.PI/180) * rng * scale };
        _drawShipIcon(ctx, pos.x, pos.y, v.heading || 0, 6, "#4DCFB4");
        ctx.globalAlpha = 0.7;
        ctx.font = "10px 'IBM Plex Mono'";
        ctx.fillStyle = "#4DCFB4";
        ctx.textAlign = "center";
        ctx.fillText(v.name?.slice(0,10) || "VESSEL", pos.x, pos.y + 18);
        ctx.globalAlpha = 1;
      }
    }

    /* ─ team node pins (wall mode) ─ */
    const nodes = window.MESH_STATE?.nodes || [];
    if (_showTeamNodes && isWall && nodes.length) {
      const scale = Math.min(w, h) / 2 / 30;
      for (const n of nodes) {
        if (!n.lat || !n.lon) continue;
        const rng = window.GEO?.haversineNm?.(_rxLat, _rxLon, n.lat, n.lon) ?? 999;
        if (rng > 50) continue;
        const brg = window.GEO?.bearingDeg?.(_rxLat, _rxLon, n.lat, n.lon) ?? 0;
        const pos = { x: cx + Math.sin(brg * Math.PI/180) * rng * scale,
                      y: cy - Math.cos(brg * Math.PI/180) * rng * scale };
        ctx.fillStyle = "#5BCF8E";
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - 10); ctx.lineTo(pos.x + 7, pos.y + 4);
        ctx.lineTo(pos.x, pos.y + 1);  ctx.lineTo(pos.x - 7, pos.y + 4);
        ctx.closePath(); ctx.fill();
        ctx.font = "10px 'IBM Plex Mono'";
        ctx.fillStyle = "#5BCF8E";
        ctx.textAlign = "center";
        ctx.fillText((n.name || n.id)?.slice(0,10), pos.x, pos.y + 20);
      }
    }

    /* ─ briefing mode overlay ─ */
    if (isBrief) {
      ctx.fillStyle = "rgba(10,14,19,.88)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = `700 ${Math.round(w/30)}px 'Rajdhani'`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(98,217,247,.9)";
      ctx.fillText("SKYMESH SCOUT — BRIEFING", cx, 44);
      ctx.font = "11px 'IBM Plex Mono'";
      ctx.fillStyle = "rgba(199,211,220,.45)";
      ctx.fillText("SITUATIONAL AWARENESS ONLY · NOT CERTIFIED AVIONICS", cx, 62);
      let row = 92;
      const colW = w * 0.35;
      for (const ac of aircraft.slice(0, 10)) {
        const brg = window.GEO?.bearingDeg?.(_rxLat, _rxLon, ac.lat, ac.lon) ?? 0;
        const rng = window.GEO?.haversineNm?.(_rxLat, _rxLon, ac.lat, ac.lon) ?? 0;
        const compass = ["N","NE","E","SE","S","SW","W","NW"][Math.round(brg/45)%8];
        ctx.fillStyle = "rgba(98,217,247,.8)";
        ctx.font = `600 13px 'Rajdhani'`;
        ctx.textAlign = "left";
        ctx.fillText(`${(ac.name||"?").padEnd(10)}  ${Math.round(ac.altitude||0).toString().padStart(6)} ft  ${rng.toFixed(1).padStart(5)} nm  ${compass}  ${_qualityLabel(ac.source)}`, cx - colW, row);
        row += 20;
        if (row > h - 30) break;
      }
      if (aircraft.length === 0) {
        ctx.fillStyle = "rgba(107,123,136,.5)";
        ctx.font = "12px 'IBM Plex Mono'";
        ctx.textAlign = "center";
        ctx.fillText("No aircraft in range", cx, cy);
      }
    }

    /* ─ HUD overlay (all modes except briefing) ─ */
    if (!isBrief) {
      const acCount = aircraft.length;
      const hasLive  = aircraft.some(a => a.source && a.source !== "DEMO");
      ctx.globalAlpha = 0.45 * dimF;
      ctx.font = "10px 'IBM Plex Mono'";
      ctx.textAlign = "left";
      ctx.fillStyle = isCamp ? "#5A4030" : "#8AAABB";
      ctx.fillText(`${acCount} AIRCRAFT · ${hasLive ? "LIVE ADS-B" : "SIMULATED"} · ${_mode.toUpperCase()}`, 14, h - 14);
      if (ISS.lat != null) ctx.fillText("ISS LIVE · wheretheiss.at", 14, h - 28);
      ctx.globalAlpha = 1;
    }
  }

  /* ── public API ── */
  function init(canvas, opts = {}) {
    _canvas  = canvas;
    _rxLat   = opts.lat ?? window.SOURCES?.CFG?.rxLat ?? 34.615;
    _rxLon   = opts.lon ?? window.SOURCES?.CFG?.rxLon ?? -112.45;
    _running = true;
    requestAnimationFrame(_draw);
  }

  function setMode(m) { _mode = m; }
  function setCanvas(c) { _canvas = c; }
  function setPosition(lat, lon) { _rxLat = lat; _rxLon = lon; }
  function stop() { _running = false; }
  function setOptions(opts) {
    if (opts.showStars         !== undefined) _showStars          = opts.showStars;
    if (opts.showConstellations!== undefined) _showConstellations = opts.showConstellations;
    if (opts.showMoon          !== undefined) _showMoon           = opts.showMoon;
    if (opts.showISS           !== undefined) _showISS            = opts.showISS;
    if (opts.showAircraft      !== undefined) _showAircraft       = opts.showAircraft;
    if (opts.showVessels       !== undefined) _showVessels        = opts.showVessels;
    if (opts.showTeamNodes     !== undefined) _showTeamNodes      = opts.showTeamNodes;
  }

  return { init, stop, setMode, setCanvas, setPosition, setOptions,
           setOverheadRange: (nm) => { _overheadRangeNm = nm; } };
})();
