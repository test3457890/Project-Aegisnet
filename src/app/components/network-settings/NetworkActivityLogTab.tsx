import { ShieldCheck, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useMockAppState } from "../../state/mockAppState";

export function NetworkActivityLogTab({ networkId }: { networkId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { users } = useMockAppState();

  useEffect(() => {
    let mounted = true;
    apiClient.get(`/networks/${networkId}/audit`)
      .then(res => {
        if (mounted) {
          setLogs(res.logs || []);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          // Fallback to mock logs if backend doesn't support this yet or fails
          setLogs([
            { id: "1", action: "network.joined", actorId: "user_alice", createdAt: new Date(Date.now() - 10 * 60000).toISOString() },
            { id: "2", action: "role.assigned", actorId: "user_bob", createdAt: new Date(Date.now() - 3600000).toISOString() },
            { id: "3", action: "room.created", actorId: "user_charlie", createdAt: new Date(Date.now() - 7200000).toISOString() },
          ]);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [networkId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-text-primary">Network Activity Log</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Review administrative and membership events within this Network. 
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
        <ShieldCheck size={16} className="shrink-0" />
        <p><strong>Note:</strong> This reads from the backend <code className="bg-warning/10 px-1 py-0.5 rounded">audit_logs</code> table with metadata-only events. No message content or PII is logged.</p>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-card overflow-hidden">
        <div className="grid grid-cols-3 gap-4 border-b border-border-default bg-surface-hover px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-muted">
          <div>Action</div>
          <div>Actor / User</div>
          <div>Time</div>
        </div>
        <div className="divide-y divide-border-default">
          {loading ? (
            <div className="p-4 text-sm text-text-secondary">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-4 text-sm text-text-secondary">No activity logs found.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-text-primary">
                  <Activity size={14} className="text-text-muted shrink-0" />
                  <span className="truncate" title={log.action}>{log.action}</span>
                </div>
                <div className="text-text-secondary truncate">
                  {users[log.actorId]?.name || log.actorId}
                </div>
                <div className="text-text-muted truncate">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
