import { useMockAppState } from "../../state/mockAppState";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { AdminCard } from "./adminShared";
import { logQaEvent } from "../../qa/qaEvents";

export function AdminTestingReadiness() {
  const { networks, me, users } = useMockAppState();

  const networkReadiness = useMemo(() => {
    return Object.values(networks).map((network) => {
      const hasDescription = !!network.description?.trim();
      const hasMembers = network.memberIds && network.memberIds.length > 1;
      const hasRooms = network.rooms.some(category => category.items.length > 0);
      const hasCustomRoles = network.roles && network.roles.length > 0;
      
      const score = [hasDescription, hasMembers, hasRooms, hasCustomRoles].filter(Boolean).length;
      const ready = score >= 3;

      return {
        id: network.id,
        name: network.name,
        checks: {
          hasDescription,
          hasMembers,
          hasRooms,
          hasCustomRoles,
        },
        score,
        ready
      };
    });
  }, [networks]);

  const profileReady = useMemo(() => {
    return {
      hasAvatar: !!me.profilePictureUrl || me.initials !== "??",
      hasBio: !!me.bio?.trim(),
      hasStatus: !!me.statusText?.trim(),
      hasTrustedContacts: Object.keys(users).length > 1, // just a mock check
    };
  }, [me, users]);

  const handleRunTests = () => {
    logQaEvent({ type: "testing.dashboard.run_checks", userId: me.id });
    // In a real app this might trigger a suite of automated diagnostic checks
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Prototype Testing Readiness</h2>
          <p className="text-sm text-text-secondary">Check if your local data is ready for comprehensive manual testing.</p>
        </div>
        <button 
          onClick={handleRunTests}
          className="flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover transition-colors"
        >
          <RefreshCw size={16} /> Refresh Checks
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AdminCard title="Personal Profile Setup">
          <ul className="space-y-3 mt-4">
            <CheckItem label="Profile avatar or initials set" passed={profileReady.hasAvatar} />
            <CheckItem label="Bio text added" passed={profileReady.hasBio} />
            <CheckItem label="Custom status text set" passed={profileReady.hasStatus} />
            <CheckItem label="Has at least one other user" passed={profileReady.hasTrustedContacts} />
          </ul>
        </AdminCard>

        <AdminCard title="Network Completeness">
          {networkReadiness.length === 0 ? (
            <p className="text-sm text-text-muted mt-4">No networks created yet.</p>
          ) : (
            <div className="space-y-4 mt-4">
              {networkReadiness.map((net) => (
                <div key={net.id} className="rounded-xl border border-border-default bg-background-secondary p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-text-primary">{net.name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${net.ready ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {net.score}/4 Checks
                    </span>
                  </div>
                  <ul className="space-y-1">
                    <CheckItem small label="Has description" passed={net.checks.hasDescription} />
                    <CheckItem small label="Has members" passed={net.checks.hasMembers} />
                    <CheckItem small label="Has rooms" passed={net.checks.hasRooms} />
                    <CheckItem small label="Has custom roles" passed={net.checks.hasCustomRoles} />
                  </ul>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
      
      <div className="flex items-start gap-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20 p-4">
        <AlertCircle className="text-accent-readable shrink-0 mt-0.5" size={18} />
        <div className="text-sm">
          <p className="font-semibold text-accent-readable">Testing Note</p>
          <p className="text-accent-readable/80 mt-1">
            This dashboard helps ensure you have populated enough mock data to fully explore the prototype's features. 
            It does not validate backend schema or connectivity.
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, passed, small = false }: { label: string; passed: boolean; small?: boolean }) {
  return (
    <li className={`flex items-start gap-2 ${small ? 'text-[11px]' : 'text-sm'}`}>
      {passed ? (
        <CheckCircle2 size={small ? 14 : 18} className="text-success shrink-0 mt-0.5" />
      ) : (
        <XCircle size={small ? 14 : 18} className="text-text-muted opacity-50 shrink-0 mt-0.5" />
      )}
      <span className={passed ? "text-text-primary font-medium" : "text-text-muted"}>{label}</span>
    </li>
  );
}
