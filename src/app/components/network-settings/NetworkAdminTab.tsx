import { useAdminState, AUDIT_ACTIONS } from "../../state/adminState";
import { relativeTime, SeverityBadge } from "../admin/adminShared";
import { ShieldAlert, Activity, FileClock } from "lucide-react";
import { useState } from "react";

export function NetworkAdminTab({ network, isOwner }: { network: any, isOwner: boolean }) {
  const { auditEvents } = useAdminState();
  const [filter, setFilter] = useState("");
  
  const networkEvents = auditEvents.filter(event => event.networkId === network.id);
  const filteredEvents = networkEvents.filter(event => 
    !filter || 
    event.action.toLowerCase().includes(filter.toLowerCase()) || 
    event.summary.toLowerCase().includes(filter.toLowerCase()) ||
    (event.target && event.target.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-default bg-surface-card p-6">
        <div className="flex items-center gap-3 border-b border-border-default pb-4 mb-4">
          <ShieldAlert className="text-accent-primary" size={24} />
          <div>
            <h2 className="text-lg font-bold text-text-primary">Network Administration</h2>
            <p className="text-sm text-text-muted">Manage operational metadata and network-specific audit logs.</p>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text-primary flex items-center gap-2">
                <FileClock size={16} className="text-text-muted" /> 
                Network Audit Log
              </h3>
              <input
                type="text"
                placeholder="Search logs..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="rounded-lg border border-border-default bg-background-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
            </div>
            
            <p className="text-xs text-text-muted mb-4 border border-border-default rounded-lg bg-background-secondary p-2">
              Admins see operational metadata only. Private message bodies, decrypted files, passwords, tokens, and encryption keys are never shown here.
            </p>

            <div className="rounded-xl border border-border-default overflow-hidden">
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-sm">
                  No audit events found for this network.
                </div>
              ) : (
                <ul className="divide-y divide-border-default bg-surface-card">
                  {filteredEvents.map(event => (
                    <li key={event.id} className="p-3 hover:bg-surface-hover transition-colors flex items-center gap-3">
                      <SeverityBadge severity={event.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {AUDIT_ACTIONS[event.action]?.label || event.action}
                        </p>
                        <p className="truncate text-xs text-text-muted">
                          {event.summary}{event.target ? ` · ${event.target}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-text-secondary">{relativeTime(event.at)}</p>
                        <p className="text-[10px] text-text-muted uppercase font-bold mt-0.5">{event.actorId}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
