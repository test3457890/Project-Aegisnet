#!/usr/bin/env python3
"""
adsb_mesh_alert.py — SkyMesh Scout bridge

Reads readsb/dump1090-fa aircraft.json, filters for close + low traffic,
and sends compact text alerts to a Meshtastic node over USB serial.

Airtime discipline is the whole design:
  - one aircraft per message
  - per-aircraft repeat window
  - short fixed-format text only

Config lives in config.json next to this file (shared with the dashboard).
"""

import json
import math
import time
from pathlib import Path

import meshtastic
import meshtastic.serial_interface

HERE = Path(__file__).resolve().parent
CFG_PATH = HERE.parent / "config.json"

DEFAULTS = {
    "rxLat": 47.6062,
    "rxLon": -122.3321,
    "aircraftJson": "/run/readsb/aircraft.json",
    "maxRangeNm": 10.0,
    "maxAltFt": 8000,
    "pollSeconds": 15,
    "repeatMinutes": 10,
    "serialDev": None,            # None = auto-detect
}


def load_cfg():
    cfg = dict(DEFAULTS)
    try:
        cfg.update(json.loads(CFG_PATH.read_text()))
    except Exception:
        pass
    return cfg


def haversine_nm(lat1, lon1, lat2, lon2):
    r = 3440.065
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def bearing_deg(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dl) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def compass(brg):
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][round(brg / 45) % 8]


def main():
    cfg = load_cfg()
    last_seen = {}  # hex -> last alert timestamp

    print("SkyMesh bridge: connecting to Meshtastic node...")
    iface = meshtastic.serial_interface.SerialInterface(devPath=cfg["serialDev"])
    print("Connected. Watching", cfg["aircraftJson"])

    while True:
        try:
            data = json.loads(Path(cfg["aircraftJson"]).read_text())
        except Exception as exc:
            print("aircraft.json read failed:", exc)
            time.sleep(cfg["pollSeconds"])
            continue

        now = time.time()
        repeat_s = cfg["repeatMinutes"] * 60

        for ac in data.get("aircraft", []):
            lat, lon, hexid = ac.get("lat"), ac.get("lon"), ac.get("hex")
            alt = ac.get("alt_baro")
            if lat is None or lon is None or hexid is None:
                continue
            if not isinstance(alt, (int, float)):
                continue  # on ground or no baro altitude

            rng = haversine_nm(cfg["rxLat"], cfg["rxLon"], lat, lon)
            if rng > cfg["maxRangeNm"] or alt > cfg["maxAltFt"]:
                continue
            if hexid in last_seen and now - last_seen[hexid] < repeat_s:
                continue

            last_seen[hexid] = now
            call = (ac.get("flight") or hexid).strip()
            brg = bearing_deg(cfg["rxLat"], cfg["rxLon"], lat, lon)
            msg = f"AC {call} {int(alt)}ft {rng:.1f}nm {compass(brg)}"
            print("ALERT:", msg)
            iface.sendText(msg)
            break  # one aircraft per poll cycle

        # prune stale dedupe entries
        for h in list(last_seen):
            if now - last_seen[h] > repeat_s * 2:
                del last_seen[h]

        time.sleep(cfg["pollSeconds"])


if __name__ == "__main__":
    main()
