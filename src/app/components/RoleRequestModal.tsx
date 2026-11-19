import React, { useState } from "react";
import { useMockAppState } from "../../state/mockAppState";
import { X } from "lucide-react";

export function RoleRequestModal({ 
  networkId, 
  roleName, 
  onClose 
}: { 
  networkId: string; 
  roleName: string; 
  onClose: () => void; 
}) {
  const { requestRole } = useMockAppState();
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestRole(networkId, roleName, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border-default bg-surface-card p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Request Role: {roleName}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-primary">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-background-secondary p-2 text-sm text-text-primary outline-none focus:border-accent-primary"
              rows={3}
              placeholder="Why do you need this role?"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-bold text-accent-readable hover:bg-accent-hover"
            >
              Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
