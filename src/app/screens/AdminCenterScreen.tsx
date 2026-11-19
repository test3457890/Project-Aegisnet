import { useState } from "react";
import { clsx } from "clsx";
import {
  Activity, FileClock, Gauge, LayoutDashboard, LifeBuoy, Network, Server, ShieldAlert,
  SlidersHorizontal, Users, Bug,
} from "lucide-react";
import { useMockAppState } from "../state/mockAppState";
import { AUDIT_ACTIONS, PolicySettings, useAdminState } from "../state/adminState";
import { AdminAuditLog } from "../components/admin/AdminAuditLog";
import { AdminRoles } from "../components/admin/AdminRoles";
import { AdminServerOps } from "../components/admin/AdminServerOps";
import { AdminSupport } from "../components/admin/AdminSupport";
import { AdminCard, relativeTime, SeverityBadge, Stat } from "../components/admin/adminShared";
import { AdminTestingReadiness } from "../components/admin/AdminTestingReadiness";
import { AdminDevErrors } from "../components/admin/AdminDevErrors";
import { NavLink } from "react-router";

type Tab = "overview" | "networks" | "members" | "roles" | "audit" | "server" | "support" | "policies" | "testing" | "dev-errors";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "networks", label: "Networks", icon: Network },
  { id: "members", label: "Members", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: ShieldAlert },
  { id: "audit", label: "Audit Logs", icon: FileClock },
  { id: "server", label: "Backend Ops (Dev Only)", icon: Server },
  { id: "support", label: "Support Tickets", icon: LifeBuoy },
  { id: "policies", label: "Policy Settings", icon: SlidersHorizontal },
  { id: "testing", label: "Testing Readiness", icon: ShieldAlert },
  { id: "dev-errors", label: "Dev Errors", icon: Bug },
];

export function AdminCenterScreen() {
  const [tab, setTab] = useState<Tab>("overview");
  const { org } = useAdminState();

  return (
    <div className="flex h-full flex-col bg-background-primary">
      <header className="shrink-0 border-b border-border-default px-4 lg:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-readable"><ShieldAlert size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Global Dev and Operator Diagnostics</h1>
            <p className="text-xs text-text-secondary">{org.name} · {org.deploymentType} · global diagnostics (not for normal users)</p>
          </div>
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto scrollbar-clean" aria-label="Admin Center sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={clsx(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition-colors",
                tab === item.id ? "bg-surface-selected text-text-primary" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              )}
            >
              <item.icon size={15} /> {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-clean p-4 lg:p-6" tabIndex={0}>
        <div className="mx-auto max-w-5xl">
          {tab === "overview" && <Overview />}
          {tab === "networks" && <Networks />}
          {tab === "members" && <Members />}
          {tab === "roles" && <AdminRoles />}
          {tab === "audit" && <AdminAuditLog />}
          {tab === "server" && <AdminServerOps />}
          {tab === "support" && <AdminSupport />}
          {tab === "policies" && <Policies />}
          {tab === "testing" && <AdminTestingReadiness />}
          {tab === "dev-errors" && <AdminDevErrors />}
        </div>
      </div>
    </div>
  );
}

function Overview() {
  const { org, auditEvents, tickets, policies } = useAdminState();
  const { networks, users, chatList, isBackendConnected, privacyMode } = useMockAppState();
  const roomCount = Object.values(networks).reduce((total, network) => total + network.rooms.flatMap((s) => s.items).length, 0);
  const memberCount = new Set(Object.values(networks).flatMap((network) => network.memberIds || [])).size || Object.keys(users).length;
  const warnings = auditEvents.filter((event) => event.severity === "warning" || event.severity === "critical");
  const recent = auditEvents.slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active Networks" value={Object.keys(networks).length} />
        <Stat label="Active Rooms" value={roomCount} />
        <Stat label="Members" value={memberCount} />
        <Stat label="Open tickets" value={tickets.length} tone={tickets.length ? "warn" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard title="System health" icon={<Gauge size={15} className="text-accent-readable" />}>
          <ul className="space-y-1.5 text-sm">
            <HealthLine label="Deployment mode" value={org.deploymentType} />
            <HealthLine label="Backend API" value={isBackendConnected ? "Connected" : "Local fallback"} tone={isBackendConnected ? "ok" : "warn"} />
            <HealthLine label="Privacy posture" value={privacyMode} />
            <HealthLine label="Logging" value={policies.loggingEnabled ? "On" : "Off"} tone={policies.loggingEnabled ? "ok" : "warn"} />
            <HealthLine label="Direct chats / groups" value={String(Object.keys(chatList).length)} />
            <HealthLine label="Warnings & alerts" value={String(warnings.length)} tone={warnings.length ? "warn" : "ok"} />
          </ul>
        </AdminCard>

        <AdminCard title="Recent admin actions" icon={<Activity size={15} className="text-accent-readable" />}>
          <ul className="space-y-1.5">
            {recent.map((event) => (
              <li key={event.id} className="flex items-center gap-2 rounded-lg border border-border-default bg-background-secondary px-3 py-2">
                <SeverityBadge severity={event.severity} />
                <span className="min-w-0 flex-1 truncate text-xs text-text-primary">{AUDIT_ACTIONS[event.action]?.label || event.action}{event.target && <span className="text-text-muted"> · {event.target}</span>}</span>
                <span className="shrink-0 text-[11px] text-text-primary">{relativeTime(event.at)}</span>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>

      {warnings.length > 0 && (
        <AdminCard title={`Warnings & alerts (${warnings.length})`}>
          <ul className="space-y-1.5">
            {warnings.slice(0, 5).map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
                <span className="truncate text-xs text-text-primary">{event.summary}</span>
                <span className="shrink-0 text-[11px] text-text-primary">{relativeTime(event.at)}</span>
              </li>
            ))}
          </ul>
        </AdminCard>
      )}

      <p className="rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-xs text-text-muted">
        Admins see operational metadata only. Private message bodies, decrypted files, passwords, tokens, and encryption keys are never shown here.
      </p>
    </div>
  );
}

function Networks() {
  const { networks, networkOrder, privacyMode, me } = useMockAppState();
  const { logAudit } = useAdminState();
  const order = networkOrder.length ? networkOrder : Object.keys(networks);
  return (
    <div className="space-y-2">
      {order.map((id) => {
        const network = networks[id];
        if (!network) return null;
        const rooms = network.rooms.flatMap((s) => s.items);
        const isOwner = network.ownerId === me.id;
        return (
          <div key={id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border-default bg-surface-card p-3">
            <div className={clsx("flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white", network.color)}>{network.initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-text-primary">{network.name}</p>
              <p className="text-[11px] text-text-muted">{(network.memberIds || []).length} members · {rooms.length} rooms · privacy: {privacyMode}</p>
            </div>
            <span className={clsx("rounded-md px-2 py-0.5 text-[10px] font-bold", isOwner ? "bg-success/10 text-success" : "bg-surface-hover text-text-secondary")}>{isOwner ? "Owner" : "Member"}</span>
            <NavLink to="/app/settings" onClick={() => logAudit("network.updated", { target: network.name, networkId: id, summary: "Opened Network settings" })} className="rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-hover">Settings</NavLink>
          </div>
        );
      })}
    </div>
  );
}

function Members() {
  const { networks, users, me, invitations } = useMockAppState();
  const { logAudit } = useAdminState();
  const memberIds = Array.from(new Set([me.id, ...Object.values(networks).flatMap((network) => network.memberIds || []), ...Object.keys(users)]));
  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-xs text-text-muted">
        {invitations.length} local invitation code(s) generated. Remove/suspend are mock actions that record an audit event but do not delete real accounts in this prototype.
      </p>
      <div className="overflow-x-auto scrollbar-clean rounded-2xl border border-border-default">
        <table className="w-full text-sm">
          <thead className="bg-background-secondary text-left text-[11px] uppercase tracking-wider text-text-muted">
            <tr><th className="px-3 py-2">Member</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Trusted device</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {memberIds.map((id) => {
              const user = id === me.id ? me : users[id];
              if (!user) return null;
              return (
                <tr key={id} className="border-t border-border-default">
                  <td className="px-3 py-2"><span className="flex items-center gap-2"><span className={clsx("flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white", user.avatarColor)}>{user.initials}</span><span className="text-text-primary">{user.name}{id === me.id && " (you)"}</span></span></td>
                  <td className="px-3 py-2 text-text-secondary">{user.role || "Member"}</td>
                  <td className="px-3 py-2 text-text-secondary capitalize">{user.status}</td>
                  <td className="px-3 py-2 text-text-muted">Prototype — n/a</td>
                  <td className="px-3 py-2 text-right">
                    {id !== me.id && (
                      <button onClick={() => logAudit("member.removed", { target: user.name, summary: "Member suspend (mock action)" })} className="rounded-lg border border-border-default px-2.5 py-1 text-[11px] font-bold text-text-secondary hover:bg-surface-hover">Suspend (mock)</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Policies() {
  const { policies, setPolicy } = useAdminState();
  const toggle = (key: keyof PolicySettings, value: PolicySettings[keyof PolicySettings]) => setPolicy(key, value as never);
  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-xs text-text-muted">Local prototype policy defaults. Changing a policy records an audit event. Screenshot protection is best-effort deterrence only (the web cannot block screenshots).</p>
      <PolicyRow label="Default Network privacy" hint="Applied to new Networks (prototype default).">
        <select value={policies.defaultNetworkPrivacy} onChange={(e) => toggle("defaultNetworkPrivacy", e.target.value as never)} className={policyInput}>
          <option value="normal">Normal</option><option value="shield">Shield</option><option value="lockdown">Lockdown</option>
        </select>
      </PolicyRow>
      <PolicyToggle label="File Vault: encrypt at rest by default" value={policies.vaultDefaultEncrypted} onChange={(v) => toggle("vaultDefaultEncrypted", v)} />
      <PolicyToggle label="File Vault: allow downloads" value={policies.vaultAllowDownload} onChange={(v) => toggle("vaultAllowDownload", v)} />
      <PolicyRow label="Screenshot / privacy policy" hint="Deterrence only — not enforceable on the web.">
        <select value={policies.screenshotPolicy} onChange={(e) => toggle("screenshotPolicy", e.target.value as never)} className={policyInput}>
          <option value="allow">Allow</option><option value="deter">Deter (blur/hide)</option>
        </select>
      </PolicyRow>
      <PolicyRow label="Guest policy" hint="What guests can do by default.">
        <select value={policies.guestPolicy} onChange={(e) => toggle("guestPolicy", e.target.value as never)} className={policyInput}>
          <option value="off">Off</option><option value="read-only">Read only</option><option value="limited">Limited</option>
        </select>
      </PolicyRow>
      <PolicyRow label="Retention (days)" hint="0 = keep. Local prototype only.">
        <input type="number" min={0} value={policies.retentionDays} onChange={(e) => toggle("retentionDays", Math.max(0, Number(e.target.value)) as never)} className={clsx(policyInput, "w-24")} />
      </PolicyRow>
      <PolicyToggle label="Logging policy: record audit events" value={policies.loggingEnabled} onChange={(v) => toggle("loggingEnabled", v)} />
      <PolicyRow label="Support data sharing" hint="Whether to ask before attaching diagnostics.">
        <select value={policies.supportDataSharing} onChange={(e) => toggle("supportDataSharing", e.target.value as never)} className={policyInput}>
          <option value="ask">Ask first</option><option value="never">Never share</option>
        </select>
      </PolicyRow>
    </div>
  );
}

const policyInput = "rounded-lg border border-border-default bg-background-secondary px-2 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none";

function PolicyRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-surface-card p-3">
      <div><p className="text-sm font-semibold text-text-primary">{label}</p>{hint && <p className="text-[11px] text-text-muted">{hint}</p>}</div>
      {children}
    </div>
  );
}

function PolicyToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <PolicyRow label={label}>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={clsx("relative h-6 w-11 rounded-full transition-colors", value ? "bg-accent-secondary" : "bg-surface-hover")}
      >
        <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", value ? "left-[22px]" : "left-0.5")} />
      </button>
    </PolicyRow>
  );
}

function HealthLine({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border-default pb-1.5 last:border-0">
      <span className="text-text-muted">{label}</span>
      <span className={clsx("font-bold capitalize", tone === "warn" ? "text-text-primary" : tone === "ok" ? "text-success" : "text-text-primary")}>
        {tone === "warn" ? <span className="inline-block mr-1.5 h-2 w-2 rounded-full bg-warning"></span> : null}
        {value}
      </span>
    </li>
  );
}
