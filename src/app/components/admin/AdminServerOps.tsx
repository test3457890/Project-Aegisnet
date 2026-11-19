import { useEffect, useState } from "react";
import { Activity, ClipboardCopy, Download, RefreshCw } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";
import { checkBackendHealth } from "../../api/client";
import { buildDiagnosticsBundle, useAdminState } from "../../state/adminState";
import { AdminCard, downloadText, relativeTime, ServiceStatus, StatusRow } from "./adminShared";
import { apiClient } from "../../api/client";
import { Trash2 } from "lucide-react";

const ERROR_CATEGORIES: { key: string; label: string; planned?: boolean }[] = [
  { key: "frontend", label: "Frontend UI errors" },
  { key: "backend", label: "Backend API errors" },
  { key: "database", label: "Database errors" },
  { key: "websocket", label: "WebSocket errors" },
  { key: "upload", label: "Upload / file errors" },
  { key: "vault", label: "File Vault errors" },
  { key: "permission", label: "Permission errors" },
  { key: "auth", label: "Authentication errors", planned: true },
  { key: "quota", label: "Storage quota errors" },
  { key: "connectivity", label: "Network connectivity errors" },
  { key: "call", label: "Call device errors" },
  { key: "browser", label: "Browser permission errors" },
  { key: "launcher", label: "Launcher / startup errors" },
  { key: "dependency", label: "Dependency / install errors" },
  { key: "update", label: "Update / repair errors", planned: true },
];

export function AdminServerOps() {
  const { org, auditEvents, policies } = useAdminState();
  const { isBackendConnected, networks, users, chatList, vaultFiles, messages } = useMockAppState();
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({});
  const [health, setHealth] = useState<{ ran: boolean; backend?: boolean; at?: number }>({ ran: false });

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(({ usage, quota }) => setStorage({ usage, quota })).catch(() => undefined);
    }
  }, []);

  const backendStatus: ServiceStatus = isBackendConnected ? "ok" : "fallback";
  const messageCount = Object.values(messages).reduce((total, list) => total + list.length, 0);
  const warnings = auditEvents.filter((event) => event.severity === "warning" || event.severity === "critical");
  const adminActions = auditEvents.filter((event) => ["permission", "support"].includes(event.category));

  const countFor = (key: string) => {
    if (key === "websocket") return auditEvents.filter((event) => event.action.startsWith("system.ws")).length;
    if (key === "upload") return auditEvents.filter((event) => event.action === "system.failed_upload").length;
    if (key === "quota") return auditEvents.filter((event) => event.action === "system.storage_warning").length;
    if (key === "backend") return auditEvents.filter((event) => event.action === "system.backend_health_warning").length;
    return 0;
  };

  const diagnostics = buildDiagnosticsBundle({
    org,
    backendConnected: isBackendConnected,
    counts: {
      networks: Object.keys(networks).length,
      rooms: Object.values(networks).reduce((total, network) => total + network.rooms.flatMap((s) => s.items).length, 0),
      users: Object.keys(users).length,
      vaultFiles: vaultFiles.length,
      tickets: 0,
      auditEvents: auditEvents.length,
    },
    storage,
    recentWarnings: warnings.slice(0, 20).map((event) => ({ at: event.at, action: event.action, summary: event.summary })),
  });

  const runHealthCheck = async () => {
    const backend = await checkBackendHealth().catch(() => false);
    setHealth({ ran: true, backend, at: Date.now() });
  };

  const copyDiagnostics = () => {
    navigator.clipboard?.writeText(JSON.stringify(diagnostics, null, 2)).catch(() => undefined);
  };

  const fmtBytes = (bytes?: number) => (bytes === undefined ? "—" : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-xs text-text-muted">
        Backend Operations (Dev Only) for on-premise deployments. Deployment mode: <span className="font-bold text-text-secondary">{org.deploymentType}</span>. Frontend-only metrics are shown where a real backend metric is not available.
      </p>

      <AdminCard title="Service Status" icon={<Activity size={15} className="text-accent-readable" />}>
        <div className="grid gap-2 sm:grid-cols-2">
          <StatusRow label="Frontend" status="ok" />
          <StatusRow label="Backend API" status={backendStatus} detail={isBackendConnected ? "Connected" : "Local fallback"} />
          <StatusRow label="WebSocket / realtime" status={isBackendConnected ? "ok" : "fallback"} detail={isBackendConnected ? "Connected" : "Local only"} />
          <StatusRow label="Database (SQLite)" status={isBackendConnected ? "ok" : "fallback"} detail={isBackendConnected ? "Ready" : "Not in use"} />
          <StatusRow label="Uploads / storage" status="ok" detail="IndexedDB" />
          <StatusRow label="File Vault" status="ok" detail="AES-GCM at rest" />
          <StatusRow label="Scheduler / jobs" status="planned" />
          <StatusRow label="Launcher" status="ok" detail="Start-AegisNet" />
        </div>
      </AdminCard>

      <AdminCard title="Infrastructure Health">
        <div className="grid gap-2 sm:grid-cols-2">
          <StatusRow label="CPU" status="planned" detail="Backend metric — N/A in frontend" />
          <StatusRow label="Memory" status="planned" detail="Backend metric — N/A in frontend" />
          <StatusRow label="Browser storage used" status="ok" detail={`${fmtBytes(storage.usage)} / ${fmtBytes(storage.quota)}`} />
          <StatusRow label="Database size" status="planned" detail="Backend metric" />
          <StatusRow label="Backups" status="planned" />
          <StatusRow label="Certificate / TLS" status="planned" />
          <StatusRow label="Port status" status={isBackendConnected ? "ok" : "planned"} detail={isBackendConnected ? "API 8000 / UI 5173" : "UI only"} />
          <StatusRow label="Uptime / last restart" status="planned" detail="Backend metric" />
        </div>
      </AdminCard>

      <AdminCard title="Error Categories">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ERROR_CATEGORIES.map((cat) => {
            const count = countFor(cat.key);
            return (
              <div key={cat.key} className="flex items-center justify-between rounded-lg border border-border-default bg-background-secondary px-3 py-2">
                <span className="text-xs text-text-secondary">{cat.label}</span>
                {cat.planned
                  ? <span className="text-[10px] font-bold text-text-muted">Planned</span>
                  : <span className={count > 0 ? "text-xs font-bold text-warning" : "text-[10px] font-bold text-success"}>{count > 0 ? count : "OK"}</span>}
              </div>
            );
          })}
        </div>
      </AdminCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard title={`Recent warnings (${warnings.length})`}>
          <ul className="space-y-1.5">
            {warnings.slice(0, 6).map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-2 rounded-lg border border-border-default bg-background-secondary px-3 py-2">
                <span className="truncate text-xs text-text-primary">{event.summary}</span>
                <span className="shrink-0 text-[11px] text-text-muted">{relativeTime(event.at)}</span>
              </li>
            ))}
            {warnings.length === 0 && <li className="text-xs text-text-muted">No recent warnings.</li>}
          </ul>
        </AdminCard>
        <AdminCard title={`Recent admin actions (${adminActions.length})`}>
          <ul className="space-y-1.5">
            {adminActions.slice(0, 6).map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-2 rounded-lg border border-border-default bg-background-secondary px-3 py-2">
                <span className="truncate text-xs text-text-primary">{event.summary}</span>
                <span className="shrink-0 text-[11px] text-text-muted">{relativeTime(event.at)}</span>
              </li>
            ))}
            {adminActions.length === 0 && <li className="text-xs text-text-muted">No recent admin actions.</li>}
          </ul>
        </AdminCard>
      </div>

      <AdminCard
        title="Diagnostics"
        action={
          <div className="flex gap-2">
            <button onClick={runHealthCheck} className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-hover"><RefreshCw size={13} /> Run health check</button>
            <button onClick={copyDiagnostics} className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-hover"><ClipboardCopy size={13} /> Copy</button>
            <button onClick={() => downloadText(`aegisnet-diagnostics-${Date.now()}.json`, JSON.stringify(diagnostics, null, 2))} className="flex items-center gap-1.5 rounded-lg bg-accent-secondary px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"><Download size={13} /> Export bundle</button>
          </div>
        }
      >
        {health.ran && (
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <StatusRow label="Frontend health" status="ok" detail="Reachable" />
            <StatusRow label="Backend /health" status={health.backend ? "ok" : "down"} detail={health.backend ? "200 OK" : "Unreachable (local fallback)"} />
            <StatusRow label="Storage quota" status="ok" detail={`${fmtBytes(storage.usage)} used`} />
            <StatusRow label="Messages tracked" status="ok" detail={String(messageCount)} />
          </div>
        )}
        <p className="mb-2 text-xs text-text-muted">
          The diagnostics bundle is sanitized: counts, statuses, and environment only. It contains no message content, file content, tokens, or keys. Data sharing policy: <span className="font-bold text-text-secondary">{policies.supportDataSharing}</span>.
        </p>
        <pre className="max-h-56 overflow-auto scrollbar-clean rounded-lg border border-border-default bg-background-secondary p-3 text-[11px] text-text-secondary">{JSON.stringify(diagnostics, null, 2)}</pre>
      </AdminCard>

      <AdminCard title="Data Retention & Cleanup" icon={<Trash2 size={15} className="text-warning" />}>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-secondary">
            [DEV ONLY] Manually wipe physical file uploads from the backend storage (`api-local` scope). Database file records will be preserved (to prevent un-syncable local ghost records) but the backend binary payload will be permanently deleted.
          </p>
          <div className="flex justify-end">
            <button
              onClick={async () => {
                if (!window.confirm("Are you sure? This will delete all physical backend file uploads for the API-local scope.")) return;
                try {
                  const res = await apiClient.delete("/files/clear");
                  alert(`Backend binary storage cleared. Deleted ${res.deletedCount} physical files.`);
                } catch (e) {
                  alert("Failed to clear binary storage.");
                }
              }}
              className="rounded-lg border border-border-default px-4 py-2 text-xs font-bold text-danger-readable hover:bg-danger/10"
            >
              Clear backend binary storage
            </button>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
