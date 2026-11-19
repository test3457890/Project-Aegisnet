import { AlertTriangle } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";

export function NetworkModerationTab({ network, isOwner }: { network: any, isOwner: boolean }) {
  const { users, me, removeNetworkMember, timeoutNetworkMember, banNetworkMember } = useMockAppState();
  
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-text-primary mb-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
        <div>
          <strong>Moderation Tools</strong>
          <p className="text-xs text-text-secondary mt-1">Actions taken here are local to this prototype and do not affect real user accounts.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(network.memberIds || [network.ownerId]).map((userId: string) => {
          const person = users[userId] || (userId === me.id ? me : null);
          if (!person) return null;
          
          const isUserOwner = userId === network.ownerId;
          const isMe = userId === me.id;
          
          if (isUserOwner) return null; // Cannot moderate the owner

          return (
            <div key={userId} className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-card p-4">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 shrink-0 rounded-full text-sm font-bold text-white flex items-center justify-center ${person.profilePictureUrl ? "" : (person.avatarColor || "bg-indigo-600")} overflow-hidden`}>
                  {person.profilePictureUrl ? <img src={person.profilePictureUrl} alt={person.name} className="h-full w-full object-cover" /> : person.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-primary">{person.name}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2 border-t border-border-default">
                <button onClick={() => {
                  if (window.confirm(`Kick ${person.name} from the network?`)) {
                    removeNetworkMember(network.id, userId);
                  }
                }} className="flex-1 rounded-lg bg-surface-hover px-2 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-selected transition-colors">
                  Kick
                </button>
                <button onClick={() => {
                  const mins = window.prompt("Timeout duration in minutes:", "10");
                  if (mins && !isNaN(Number(mins))) {
                    timeoutNetworkMember(network.id, userId, Number(mins) * 60);
                    alert(`${person.name} timed out for ${mins} minutes.`);
                  }
                }} className="flex-1 rounded-lg bg-warning/10 border border-warning/20 px-2 py-1.5 text-xs font-bold text-warning hover:bg-warning/20 transition-colors">
                  Timeout
                </button>
                <button onClick={() => {
                  if (window.confirm(`BAN ${person.name} from the network? This cannot be undone.`)) {
                    banNetworkMember(network.id, userId);
                  }
                }} className="flex-1 rounded-lg bg-danger/10 border border-danger/20 px-2 py-1.5 text-xs font-bold text-danger-readable hover:bg-danger/20 transition-colors">
                  Ban
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
