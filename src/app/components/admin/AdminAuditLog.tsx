import { useMemo, useState } from "react";
import { Download, Search, X } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";
import {
  AUDIT_ACTIONS, AUDIT_CATEGORIES, AUDIT_SEVERITIES, auditEventsToCsv, auditEventsToJson,
  AuditEvent, filterAuditEvents, useAdminState,
} from "../../state/adminState";
import { downloadText, relativeTime, SeverityBadge } from "./adminShared";

export function AdminAuditLog() {
  const { auditEvents, policies } = useAdminState();
  const { users, networks, me } = useMockAppState();
  const [category, setCategory] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [actorId, setActorId] = useState<string>("all");
  const [networkId, setNetworkId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const actorName = (id: string) => (id === "system" ? "System" : id === me.id ? me.name : users[id]?.name || id);

  const filtered = useMemo(
    () => filterAuditEvents(auditEvents, { category, severity, actorId, networkId, search } as never),
    [auditEvents, category, severity, actorId, networkId, search],
  );

  const actorIds = useMemo(() => Array.from(new Set(auditEvents.map((event) => event.actorId))), [auditEvents]);

  return (
    <div className="space-y-4">
      {!policies.loggingEnabled && (
        <p role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
          Logging policy is currently OFF in Policy Settings. New events are not being recorded.
        </p>
      )}
      <p className="rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-xs text-text-muted">
        Local prototype audit log — metadata only. It never contains message bodies, decrypted file contents, passwords, tokens, or keys.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events..."
            aria-label="Search audit events"
            className="w-52 rounded-lg border border-border-default bg-background-secondary py-1.5 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </label>
        <Select label="Category" value={category} onChange={setCategory} options={["all", ...AUDIT_CATEGORIES]} />
        <Select label="Severity" value={severity} onChange={setSeverity} options={["all", ...AUDIT_SEVERITIES]} />
        <Select label="Actor" value={actorId} onChange={setActorId} options={["all", ...actorIds]} render={(id) => (id === "all" ? "All actors" : actorName(id))} />
        <Select label="Network" value={networkId} onChange={setNetworkId} options={["all", ...Object.keys(networks)]} render={(id) => (id === "all" ? "All Networks" : networks[id]?.name || id)} />
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => downloadText(`aegisnet-audit-${Date.now()}.json`, auditEventsToJson(filtered), "application/json")}
            className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-hover"
          >
            <Download size={14} /> JSON
          </button>
          <button
            onClick={() => downloadText(`aegisnet-audit-${Date.now()}.csv`, auditEventsToCsv(filtered), "text/csv")}
            className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-hover"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <p className="text-xs text-text-muted">{filtered.length} of {auditEvents.length} events</p>

      {/* Event list */}
      <ul className="space-y-1.5">
        {filtered.map((event) => (
          <li key={event.id}>
            <button
              onClick={() => setSelected(event)}
              className="flex w-full items-center gap-3 rounded-xl border border-border-default bg-surface-card px-3 py-2.5 text-left hover:bg-surface-hover"
            >
              <SeverityBadge severity={event.severity} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {AUDIT_ACTIONS[event.action]?.label || event.action}
                  {event.target && <span className="font-normal text-text-secondary"> · {event.target}</span>}
                </p>
                <p className="truncate text-[11px] text-text-muted">
                  {actorName(event.actorId)}
                  {event.networkId && networks[event.networkId] && ` · ${networks[event.networkId].name}`}
                  {` · ${event.category}`}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-text-muted">{relativeTime(event.at)}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-xl border border-dashed border-border-default p-8 text-center text-sm text-text-muted">No events match these filters.</li>
        )}
      </ul>

      {/* Details drawer */}
      {selected && (
        <div className="fixed inset-0 z-[140] flex justify-end bg-black/40" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-sm overflow-y-auto scrollbar-clean border-l border-border-default bg-surface-card p-5" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Audit event details">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Event details</h3>
              <button onClick={() => setSelected(null)} aria-label="Close details" className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary"><X size={16} /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <Detail label="Action">{AUDIT_ACTIONS[selected.action]?.label || selected.action}</Detail>
              <Detail label="Category">{selected.category}</Detail>
              <Detail label="Severity"><SeverityBadge severity={selected.severity} /></Detail>
              <Detail label="Actor">{actorName(selected.actorId)}</Detail>
              <Detail label="Target">{selected.target || "—"}</Detail>
              <Detail label="Network">{selected.networkId ? networks[selected.networkId]?.name || selected.networkId : "—"}</Detail>
              <Detail label="When">{new Date(selected.at).toLocaleString()}</Detail>
              <Detail label="Summary">{selected.summary}</Detail>
              <Detail label="Event ID">{selected.id}</Detail>
            </dl>
            <p className="mt-4 rounded-lg border border-border-default bg-background-secondary p-2 text-[11px] text-text-muted">
              Metadata only. No message content or secrets are stored on audit events.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options, render }: { label: string; value: string; onChange: (value: string) => void; options: string[]; render?: (value: string) => string }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="rounded-lg border border-border-default bg-background-secondary px-2 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>{render ? render(option) : option === "all" ? `All ${label.toLowerCase()}` : option}</option>
        ))}
      </select>
    </label>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border-default pb-2">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right font-semibold text-text-primary">{children}</dd>
    </div>
  );
}
