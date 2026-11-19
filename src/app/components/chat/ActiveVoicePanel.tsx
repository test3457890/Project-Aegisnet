import { Phone, UserX, Mic, MicOff, Hand, Activity } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { useMockAppState } from "../../state/mockAppState";

interface ActiveVoicePanelProps {
  members: any[];
  hasPermission: (perm: string) => boolean;
}

export function ActiveVoicePanel({ members, hasPermission }: ActiveVoicePanelProps) {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { me } = useMockAppState();

  const canJoin = hasPermission("join_voice");
  const canManage = hasPermission("manage_rooms");

  const participants = inCall ? [me, ...members.slice(0, 2).filter((m) => m.id !== me.id)] : members.slice(0, 2);

  return (
    <div className="mb-6 rounded-2xl border border-border-default bg-surface-card overflow-hidden">
      <div className="bg-background-secondary px-4 py-3 border-b border-border-default flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-success" />
          <span className="font-semibold text-text-primary">Active Voice Room</span>
        </div>
        {canJoin ? (
          <button
            onClick={() => setInCall(!inCall)}
            className={clsx("px-3 py-1.5 rounded-lg text-sm font-medium", inCall ? "bg-danger text-white" : "bg-success text-white")}
          >
            {inCall ? "Leave Voice" : "Join Voice"}
          </button>
        ) : (
          <span className="text-xs text-danger">Missing join_voice permission</span>
        )}
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {participants.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background-primary border border-border-default relative">
            <img src={p.avatarUrl} alt={p.name} className={clsx("w-12 h-12 rounded-full border-2", p.id === me.id && !isMuted && inCall ? "border-success" : "border-transparent")} />
            <span className="text-xs font-medium text-text-primary truncate w-full text-center">{p.name}</span>
            {canManage && p.id !== me.id && (
              <button className="absolute top-2 right-2 text-text-secondary hover:text-danger" title="Disconnect User">
                <UserX size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      {inCall && (
        <div className="bg-background-secondary p-3 flex justify-center gap-4 border-t border-border-default">
          <button onClick={() => setIsMuted(!isMuted)} className={clsx("p-3 rounded-full", isMuted ? "bg-danger/20 text-danger" : "bg-surface-hover text-text-primary")}>
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>
      )}
    </div>
  );
}
