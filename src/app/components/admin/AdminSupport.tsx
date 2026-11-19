import { FormEvent, useState } from "react";
import { LifeBuoy, Download } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";
import {
  buildDiagnosticsBundle, DeploymentType, SupportTicket, TICKET_CATEGORIES, TicketCategory,
  TicketSeverity, useAdminState,
} from "../../state/adminState";
import { downloadText, relativeTime } from "./adminShared";

const SEVERITIES: TicketSeverity[] = ["Low", "Medium", "High", "Critical"];

export function AdminSupport() {
  const { org, tickets, createTicket, auditEvents, logAudit } = useAdminState();
  const { isBackendConnected, networks, users, vaultFiles } = useMockAppState();
  const [form, setForm] = useState({
    contactName: "",
    contactEmail: "",
    deploymentType: org.deploymentType as DeploymentType,
    affectedScope: "",
    category: "general bug" as TicketCategory,
    severity: "Medium" as TicketSeverity,
    summary: "",
    description: "",
    steps: "",
    includeLogs: false,
    includeDiagnostics: false,
  });
  const [notice, setNotice] = useState("");

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((previous) => ({ ...previous, [key]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.summary.trim()) { setNotice("Please add a short summary."); return; }
    const ticket = createTicket({
      organizationName: org.name,
      contactName: form.contactName.trim() || "Unknown",
      contactEmail: form.contactEmail.trim(),
      deploymentType: form.deploymentType,
      affectedScope: form.affectedScope.trim() || undefined,
      category: form.category,
      severity: form.severity,
      summary: form.summary.trim(),
      description: form.description.trim(),
      steps: form.steps.trim() || undefined,
      includeLogs: form.includeLogs,
      includeDiagnostics: form.includeDiagnostics,
    });
    setNotice(`Ticket ${ticket.id} saved locally. External submission to Stuff Studios LLC is not configured in this prototype.`);
    setForm((previous) => ({ ...previous, summary: "", description: "", steps: "" }));
  };

  const diagnostics = buildDiagnosticsBundle({
    org,
    backendConnected: isBackendConnected,
    counts: {
      networks: Object.keys(networks).length,
      rooms: Object.values(networks).reduce((total, network) => total + network.rooms.flatMap((s) => s.items).length, 0),
      users: Object.keys(users).length,
      vaultFiles: vaultFiles.length,
      tickets: tickets.length,
      auditEvents: auditEvents.length,
    },
    recentWarnings: auditEvents.filter((event) => event.severity === "warning").slice(0, 10).map((event) => ({ at: event.at, action: event.action, summary: event.summary })),
  });

  const exportBundle = () => {
    downloadText(`aegisnet-support-bundle-${Date.now()}.json`, JSON.stringify({ organization: org.name, diagnostics }, null, 2));
    logAudit("support.bundle_exported", { summary: "Support bundle exported (sanitized, local)" });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Create ticket */}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border-default bg-surface-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary"><LifeBuoy size={15} className="text-accent-readable" /> Create support ticket</h3>
        <p className="rounded-lg border border-amber-900/30 bg-amber-900/10 px-3 py-2 text-[11px] text-amber-500">
          Tickets are saved locally in this prototype and are <span className="font-bold">not</span> transmitted to Stuff Studios LLC. Nothing is sent without a configured endpoint.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact name"><input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className={inputClass} /></Field>
          <Field label="Contact email"><input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputClass} /></Field>
          <Field label="Deployment type">
            <select value={form.deploymentType} onChange={(e) => set("deploymentType", e.target.value as DeploymentType)} className={inputClass}>
              <option value="cloud">Cloud</option>
              <option value="local-prototype">Local prototype</option>
              <option value="on-premise">Physical server / on-premise</option>
            </select>
          </Field>
          <Field label="Affected Network or Room"><input value={form.affectedScope} onChange={(e) => set("affectedScope", e.target.value)} className={inputClass} placeholder="e.g. SAR Training Network" /></Field>
          <Field label="Issue category">
            <select value={form.category} onChange={(e) => set("category", e.target.value as TicketCategory)} className={inputClass}>
              {TICKET_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </Field>
          <Field label="Severity">
            <select value={form.severity} onChange={(e) => set("severity", e.target.value as TicketSeverity)} className={inputClass}>
              {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Short summary"><input value={form.summary} onChange={(e) => set("summary", e.target.value)} className={inputClass} required /></Field>
        <Field label="Detailed description"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={inputClass} /></Field>
        <Field label="Steps to reproduce"><textarea value={form.steps} onChange={(e) => set("steps", e.target.value)} rows={2} className={inputClass} /></Field>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={form.includeLogs} onChange={(e) => set("includeLogs", e.target.checked)} className="h-4 w-4 accent-current text-accent-primary" /> Include sanitized error logs</label>
          <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={form.includeDiagnostics} onChange={(e) => set("includeDiagnostics", e.target.checked)} className="h-4 w-4 accent-current text-accent-primary" /> Attach sanitized diagnostics</label>
        </div>
        {notice && <p role="status" className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success">{notice}</p>}
        <button type="submit" className="rounded-xl bg-accent-secondary px-4 py-2 text-sm font-bold text-white hover:opacity-90">Save ticket locally</button>
      </form>

      {/* History + bundle */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-border-default bg-surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Support bundle</h3>
            <button onClick={exportBundle} className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-hover"><Download size={13} /> Export</button>
          </div>
          <p className="text-[11px] text-text-muted">A sanitized JSON bundle (counts, statuses, environment). No message content, file content, or secrets. Shown to you before any future submission.</p>
        </div>

        <div className="rounded-2xl border border-border-default bg-surface-card p-4">
          <h3 className="mb-3 text-sm font-bold text-text-primary">Local ticket history ({tickets.length})</h3>
          <ul className="space-y-2">
            {tickets.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)}
            {tickets.length === 0 && <li className="text-xs text-text-muted">No tickets yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</span>{children}</label>;
}

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  return (
    <li className="rounded-xl border border-border-default bg-background-secondary p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-text-primary">{ticket.summary}</span>
        <span className="shrink-0 rounded-md bg-surface-hover px-2 py-0.5 text-[10px] font-bold text-text-secondary">{ticket.severity}</span>
      </div>
      <p className="mt-1 text-[11px] text-text-muted">{ticket.category} · {ticket.deploymentType} · {relativeTime(ticket.createdAt)}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-warning">Saved locally — not submitted externally</p>
    </li>
  );
}
