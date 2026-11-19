import React from "react";
import { Check, X, ShieldAlert } from "lucide-react";
import { useMockAppState } from "../../../state/mockAppState";

export function AdminReviewQueue({ networkId }: { networkId: string }) {
  const { networks, users, approveRoleRequest, rejectRoleRequest } = useMockAppState();
  const network = networks[networkId];

  if (!network) return null;

  const pendingRequests = (network.roleRequests || []).filter(r => r.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="text-accent-primary" size={20} />
        <h2 className="text-lg font-bold text-text-primary">Review Queue</h2>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-surface-card p-6 text-center text-sm text-text-secondary">
          No pending requests.
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map(req => {
            const user = users[req.userId];
            const displayName = user ? user.name : "Unknown User";
            
            return (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-surface-card p-4">
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    {displayName} requested role: <span className="text-accent-primary">{req.roleName}</span>
                  </p>
                  {req.reason && (
                    <p className="text-xs text-text-muted mt-1 italic">"{req.reason}"</p>
                  )}
                  <p className="text-xs text-text-muted mt-1">
                    Requested on {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveRoleRequest(networkId, req.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-bold text-success hover:bg-success/25"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => rejectRoleRequest(networkId, req.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/20"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
