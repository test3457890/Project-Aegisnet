import { CloudOff, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SyncQueue } from "../state/syncQueue";
import { useMockAppState } from "../state/mockAppState";

export function OfflineSyncBanner() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isBackendConnected } = useMockAppState();

  useEffect(() => {
    const updateCount = () => {
      setPendingCount(SyncQueue.getQueue().length);
    };
    updateCount();
    window.addEventListener("aegis_sync_updated", updateCount);
    return () => window.removeEventListener("aegis_sync_updated", updateCount);
  }, []);

  if (pendingCount === 0) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    // Explicit sync flow
    await SyncQueue.flush();
    setIsSyncing(false);
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to discard all pending offline changes? This cannot be undone.")) {
      SyncQueue.clearQueue();
    }
  };

  return (
    <div className="z-50 flex items-center justify-between bg-warning-secondary px-4 py-2 text-warning-readable shadow-md">
      <div className="flex items-center gap-3">
        <CloudOff size={18} />
        <span className="text-sm font-semibold">
          {pendingCount} offline change{pendingCount === 1 ? "" : "s"} waiting to sync
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={isSyncing}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-black/10 disabled:opacity-50"
          aria-label="Discard pending changes"
        >
          <Trash2 size={14} />
          Discard
        </button>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing || !isBackendConnected}
          className="flex items-center gap-1.5 rounded-lg bg-black/10 px-3 py-1.5 text-xs font-bold hover:bg-black/20 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Syncing..." : isBackendConnected ? "Sync to Network" : "Waiting for connection"}
        </button>
      </div>
    </div>
  );
}
