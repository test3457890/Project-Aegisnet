import { useMockAppState } from "../../state/mockAppState";
import { Download, FileText, CheckCircle2, ShieldAlert } from "lucide-react";

export function PrivacyAuditTab() {
  const { devErrorLogs } = useMockAppState();

  const handleExportDiagnostics = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      kind: "aegisnet-safe-diagnostics",
      disclaimer: "Safe diagnostics report. Excludes message bodies, draft text, profile bios, private notes, HR details, file contents, auth tokens, passwords, and Vault plaintext.",
      errors: devErrorLogs,
      environment: {
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aegisnet-safe-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">Privacy & Audit Review</h2>
        <p className="text-sm text-text-muted mb-6">Review what data is logged and export safe diagnostics.</p>
        
        <div className="space-y-6">
          <div className="rounded-lg border border-border-default bg-background-secondary p-4">
            <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
              <ShieldAlert size={18} className="text-accent-primary" /> Never Recorded
            </h3>
            <p className="text-sm text-text-muted mb-4">AegisNet diagnostics and audit logs are designed to strictly exclude:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Message bodies</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Draft text</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Profile bios</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Private notes</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Protected Person details</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> HR & Medical details</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Image & File contents</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Auth tokens & Passwords</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Vault plaintext & Keys</li>
            </ul>
          </div>

          <div className="rounded-lg border border-border-default bg-background-secondary p-4">
            <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
              <FileText size={18} className="text-accent-primary" /> Export Safe Diagnostics
            </h3>
            <p className="text-sm text-text-muted mb-4">Download a sanitized JSON report containing recent UI crashes and state metrics, safe to share with support.</p>
            <button 
              onClick={handleExportDiagnostics}
              className="px-4 py-2 text-sm font-bold rounded-lg bg-accent-primary text-white hover:bg-accent-hover flex items-center gap-2"
            >
              <Download size={16} /> Export Safe Diagnostics
            </button>
          </div>

          <div className="rounded-lg border border-border-default bg-background-secondary p-4">
            <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
              <FileText size={18} className="text-accent-primary" /> Recent Local QA Events
            </h3>
            <p className="text-sm text-text-muted mb-4">This build logs certain actions locally as QA events to assist testing. These logs are not transmitted anywhere.</p>
            {/* We could list them here, but the user can go to the QAModeScreen to see the full list */}
            <a href="/app/qa" className="text-sm text-accent-readable font-medium hover:underline">View Local QA Event Log</a>
          </div>
        </div>
      </div>
    </div>
  );
}
