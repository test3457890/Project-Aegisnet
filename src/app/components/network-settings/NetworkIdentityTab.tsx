import { useMockAppState } from "../../state/mockAppState";
import { ShieldAlert, ShieldCheck, CheckCircle2, UserCheck, AlertTriangle } from "lucide-react";
import { useParams } from "react-router";
import { ProtectedPersonBadge, SupervisorBadge, BackendBackedBadge, LocalOnlyBadge } from "../ui/Badges";

export function NetworkIdentityTab() {
  const { networkId } = useParams();
  const { networks, users, me } = useMockAppState();
  
  if (!networkId || !networks[networkId]) return null;
  const network = networks[networkId];

  // Mock lists based on users in the network
  const members = network.memberIds?.map(id => id === me.id ? me : users[id]).filter(Boolean) || [];
  const owner = members.find(m => m.id === network.ownerId);
  const admins = members.filter(m => (network.memberRoles?.[m.id] || []).some(rId => network.roles?.find(r => r.id === rId)?.permissions.includes("admin")));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">Identity Context</h2>
        <p className="text-sm text-text-muted mb-4">View verified identities, protected persons, and organization context for this Network.</p>
        
        <div className="mb-6 rounded-lg border border-amber-900/30 bg-amber-900/10 px-4 py-3">
          <p className="text-sm font-medium text-amber-500">
            <AlertTriangle size={16} className="inline mr-2" />
            Identity labels shown here (including owner, admin, supervisor, protected person, contractor, guest, and mission roles) are specific to this Network only. They do not represent real-world organization verification or legal status.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border-default bg-background-secondary p-4">
            <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-accent-primary" /> Network Leadership <BackendBackedBadge />
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-background-primary">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-hover flex items-center justify-center font-bold text-text-secondary text-sm">
                    {owner?.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{owner?.name || "Unknown User"}</p>
                    <p className="text-xs text-text-secondary">Network Owner</p>
                  </div>
                </div>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              
              {admins.filter(a => a.id !== owner?.id).map(admin => (
                <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-background-primary">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-surface-hover flex items-center justify-center font-bold text-text-secondary text-sm">
                      {admin.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{admin.name}</p>
                      <p className="text-xs text-text-secondary">Network Admin</p>
                    </div>
                  </div>
                  <ShieldAlert size={16} className="text-amber-500" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border-default bg-background-secondary p-4">
            <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-accent-primary" /> Protected Persons & Supervisors <LocalOnlyBadge />
            </h3>
            <p className="text-sm text-text-muted mb-4">Supervised communication policies apply to these members within this Network.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-background-primary">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-hover flex items-center justify-center font-bold text-text-secondary text-sm">T</div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">Trainee / Cadet <ProtectedPersonBadge /></p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-background-primary">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-hover flex items-center justify-center font-bold text-text-secondary text-sm">S</div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">Senior Member / Supervisor <SupervisorBadge /></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
