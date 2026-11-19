import { Trash2, ShieldAlert, Database, HardDrive, RefreshCw } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";
import { useState } from "react";
import { logQaEvent } from "../../qa/qaEvents";
import { useNavigate } from "react-router";

export function DataHygieneTab() {
  const { clearLocalData, me } = useMockAppState();
  const [confirmClear, setConfirmClear] = useState(false);
  const navigate = useNavigate();

  const handleClearData = () => {
    logQaEvent({ type: "local_data.clear.attempted", userId: me.id });
    try {
      clearLocalData();
      logQaEvent({ type: "local_data.clear.succeeded", userId: me.id, success: true });
      navigate("/"); // Redirect to landing or app refresh
      window.location.reload(); // Hard reload to clear all states
    } catch {
      logQaEvent({ type: "local_data.clear.failed", userId: me.id, success: false });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Data Hygiene</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your local prototype data. These controls affect your browser storage only.
        </p>
      </div>

      <div className="rounded-2xl border border-border-default bg-surface-card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background-secondary border border-border-default">
            <HardDrive size={20} className="text-text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary">Local Storage Usage</h3>
            <p className="mt-1 text-sm text-text-secondary">
              AegisNet currently runs entirely in your browser using local storage and IndexedDB. 
              No backend connection is required for basic prototype use.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 border border-danger/20">
            <Trash2 size={20} className="text-danger-readable" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-danger-readable">Clear Mock Storage</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Wipe all local networks, profiles, settings, and mock states. This will reset the prototype 
              to its initial seed state. This action cannot be undone.
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-text-secondary">
              <li>Chat messages, rooms, and networks</li>
              <li>Local Vault Files, File Permissions, and File Access Logs</li>
              <li>Mission Tasks, Calendar Events, and Duty Check-ins</li>
              <li>Safety settings, preferences, and QA events</li>
            </ul>
            
            <div className="mt-4">
              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-bold text-danger-readable hover:bg-danger/20 transition-colors"
                >
                  Clear Local Data
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold text-text-primary">Are you sure?</span>
                  <button
                    onClick={handleClearData}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
                  >
                    Yes, wipe everything
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="rounded-xl border border-border-default bg-surface-card px-4 py-2 text-sm font-bold text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20 p-4">
        <ShieldAlert className="text-accent-readable shrink-0 mt-0.5" size={18} />
        <div className="text-sm">
          <p className="font-semibold text-accent-readable">Prototype Notice</p>
          <p className="text-accent-readable/80 mt-1">
            These tools only delete local browser data. In a production environment, wiping data 
            would require authenticated backend requests and network sync commands.
          </p>
        </div>
      </div>
    </div>
  );
}
