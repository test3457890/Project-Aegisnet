import { ReactNode } from "react";
import { clsx } from "clsx";
import { AuditSeverity } from "../../state/adminState";

/** Trigger a local download of text content (no network). */
export function downloadText(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function relativeTime(at?: number | string | Date): string {
  if (!at) return "unknown";
  const parsedAt = new Date(at).getTime();
  if (isNaN(parsedAt)) return "unknown";
  
  const minutes = Math.round((Date.now() - parsedAt) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const severityClasses: Record<AuditSeverity, string> = {
  info: "bg-surface-hover text-text-secondary",
  notice: "bg-accent-primary/10 text-accent-readable",
  warning: "bg-warning/10 text-warning",
  critical: "bg-danger/10 text-danger-readable",
};

export function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  return (
    <span className={clsx("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", severityClasses[severity])}>
      {severity}
    </span>
  );
}

export type ServiceStatus = "ok" | "warn" | "down" | "planned" | "fallback";

const statusMeta: Record<ServiceStatus, { dot: string; label: string; text: string }> = {
  ok: { dot: "bg-success", label: "Operational", text: "text-success" },
  fallback: { dot: "bg-warning", label: "Local fallback", text: "text-warning" },
  warn: { dot: "bg-warning", label: "Warning", text: "text-warning" },
  down: { dot: "bg-danger", label: "Down", text: "text-danger-readable" },
  planned: { dot: "bg-text-muted", label: "Planned", text: "text-text-muted" },
};

export function StatusRow({ label, status, detail }: { label: string; status: ServiceStatus; detail?: string }) {
  const meta = statusMeta[status];
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border-default bg-background-secondary px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-text-primary">
        <span className={clsx("h-2.5 w-2.5 rounded-full", meta.dot)} aria-hidden />
        {label}
      </span>
      <span className={clsx("text-xs font-bold", meta.text)}>{detail || meta.label}</span>
    </div>
  );
}

export function AdminCard({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border-default bg-surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">{icon}{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "default" | "warn" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border-default bg-surface-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={clsx("mt-1 text-2xl font-bold", tone === "danger" ? "text-danger-readable" : tone === "warn" ? "text-warning" : "text-text-primary")}>{value}</p>
    </div>
  );
}
