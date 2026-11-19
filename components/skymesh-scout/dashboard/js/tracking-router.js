/* ============================================================
   AegisNet Expansion Layer — tracking-router.js
   TrackingRouter: aggregates all tracking adapters,
   provides unified entity stream with filters.
   ============================================================ */
"use strict";

class TrackingRouter {
  constructor() {
    this._adapters   = new Map();
    this._listeners  = { update: [], adapterChange: [] };
    this._filters    = { aircraft: true, vessel: true, team: true, asset: false };
    this._allEntities = [];
  }

  register(adapter) {
    this._adapters.set(adapter.id, adapter);
    adapter.onUpdate(() => this._rebuild());
  }

  getAdapter(id) { return this._adapters.get(id); }
  getAll()       { return [...this._adapters.values()]; }

  async startAll() {
    await Promise.allSettled(this.getAll().map(a => a.start().catch(e => {
      a._setState("error", { lastError: e.message });
    })));
  }

  setFilter(type, enabled) {
    this._filters[type] = enabled;
    this._rebuild();
    window.CommsRouter?._onAdapterChange?.({});  // trigger dashboard refresh
  }

  getFilters() { return { ...this._filters }; }

  getEntities(typeFilter) {
    if (!typeFilter) return this._allEntities;
    return this._allEntities.filter(e => this._entityMatchesType(e, typeFilter));
  }

  _entityMatchesType(e, typeFilter) {
    if (typeFilter === "aircraft") return e.type === "aircraft";
    if (typeFilter === "vessel")   return e.type === "ship" || e.type === "vessel";
    if (typeFilter === "team")     return e.type === "team_node";
    if (typeFilter === "asset")    return e.type === "drone" || e.type === "vehicle" || e.type === "asset";
    return true;
  }

  _rebuild() {
    const all = [];
    for (const a of this._adapters.values()) {
      for (const e of a.getEntities()) {
        const cat = a.sourceType;
        if (cat === "aircraft" && !this._filters.aircraft) continue;
        if ((cat === "vessel")  && !this._filters.vessel)  continue;
        if (cat === "team"     && !this._filters.team)    continue;
        if (cat === "asset"    && !this._filters.asset)   continue;
        all.push({ ...e, _adapterStatus: a.dataQuality });
      }
    }
    this._allEntities = all;
    this._listeners.update.forEach(fn => { try { fn(all); } catch {} });
  }

  on(event, fn) { if (this._listeners[event]) this._listeners[event].push(fn); }
  _onAdapterChange(a) { this._listeners.adapterChange.forEach(fn => { try { fn(a); } catch {} }); }

  adapterStatuses() { return this.getAll().map(a => a.toStatus()); }
}

/* ── instantiate and wire up adapters ── */

const trackingRouter = new TrackingRouter();
trackingRouter.register(new window.TrackingAdapters.AircraftTrackingAdapter());
trackingRouter.register(new window.TrackingAdapters.MarineTrackingAdapter());
trackingRouter.register(new window.TrackingAdapters.TeamNodeTrackingAdapter());
trackingRouter.register(new window.TrackingAdapters.FutureAssetTrackingAdapter());

window.TrackingRouter = trackingRouter;
