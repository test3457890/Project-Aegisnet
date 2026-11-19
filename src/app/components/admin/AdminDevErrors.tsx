import { Bug, Trash2, Copy, CheckCircle2 } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";
import { AdminCard, relativeTime } from "./adminShared";
import { useState } from "react";
import { clsx } from "clsx";

export function AdminDevErrors() {
  const { devErrorLogs, clearDevErrors } = useMockAppState();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (log: any) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    if (window.confirm("Clear all developer error logs?")) {
      clearDevErrors();
    }
  };

  if (devErrorLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border-default bg-surface-card py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <Bug size={24} />
        </div>
        <h3 className="text-sm font-bold text-text-primary">No intercepted errors</h3>
        <p className="mt-1 text-xs text-text-secondary">The application is running smoothly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-text-primary">Developer Error Logs ({devErrorLogs.length})</h2>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10"
        >
          <Trash2 size={14} /> Clear Logs
        </button>
      </div>

      <div className="space-y-3">
        {devErrorLogs.map((log) => (
          <AdminCard key={log.id} title={log.errorName || "UnknownError"} icon={<Bug size={15} className="text-danger" />}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-[11px] font-mono text-text-secondary">
                <span className="rounded bg-background-secondary px-1.5 py-0.5">{log.timestamp ? relativeTime(log.timestamp) : "Unknown time"}</span>
                <span className="rounded bg-background-secondary px-1.5 py-0.5">Route: {log.route}</span>
                <span className="rounded bg-background-secondary px-1.5 py-0.5">Env: {log.environment}</span>
              </div>
              
              <div className="rounded-lg bg-background-primary p-3 overflow-x-auto">
                <pre className="text-xs text-danger-readable whitespace-pre-wrap font-mono">
                  {log.errorMessage}
                </pre>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => handleCopy(log)}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[11px] font-bold transition-colors",
                    copiedId === log.id ? "bg-success/10 text-success border-success/20" : "bg-surface-card text-text-secondary hover:bg-surface-hover"
                  )}
                >
                  {copiedId === log.id ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiedId === log.id ? "Copied" : "Copy JSON"}
                </button>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
