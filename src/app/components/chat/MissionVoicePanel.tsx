import { Activity, UserX, Mic, MicOff, Hand } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { useMockAppState } from "../../state/mockAppState";

interface MissionVoicePanelProps {
  members: any[];
  hasPermission: (perm: string) => boolean;
  roomLeadership: any[];
}

export function MissionVoicePanel({ members, hasPermission, roomLeadership }: MissionVoicePanelProps) {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const { me } = useMockAppState();

  const canJoin = hasPermission("join_voice");
  const canManage = hasPermission("manage_rooms");

  const participants = inCall ? [me, ...members.slice(0, 3).filter((m) => m.id !== me.id)] : members.slice(0, 3);

  return (
    <div className="mb-6 rounded-2xl border border-accent-primary/30 bg-surface-card overflow-hidden">
      <div className="bg-accent-primary/10 px-4 py-3 border-b border-accent-primary/20">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-accent-primary" />
            <span className="font-bold text-text-primary">Mission Voice Panel</span>
          </div>
          {canJoin && (
            <button
              onClick={() => setInCall(!inCall)}
              className={clsx("px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm", inCall ? "bg-danger text-white" : "bg-accent-primary text-white")}
            >
              {inCall ? "Disconnect" : "Connect"}
            </button>
          )}
        </div>
        <p className="text-[11px] text-accent-primary/80 font-medium">
          Mission Room calls are prototype coordination tools only. They are not emergency dispatch, public safety radio, legal records, or production-secure communications.
        </p>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
        {participants.map((p) => {
          const leaderNode = roomLeadership?.find((l) => l.assignedMemberId === p.id);
          return (
            <div key={p.id} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background-primary border border-border-default relative mt-3">
              {leaderNode && (
                <span className="absolute -top-5 bg-accent-primary text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm z-10 whitespace-nowrap">
                  {leaderNode.name}
                </span>
              )}
              <img src={p.avatarUrl} alt={p.name} className={clsx("w-14 h-14 rounded-full border-2", p.id === me.id && !isMuted && inCall ? "border-success" : "border-border-default")} />
              <span className="text-xs font-bold text-text-primary truncate w-full text-center">{p.name}</span>
              {canManage && p.id !== me.id && (
                <button className="absolute top-2 right-2 text-text-secondary hover:text-danger" title="Disconnect User">
                  <UserX size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {inCall && (
        <div className="bg-background-secondary p-3 flex justify-center sm:justify-between items-center gap-4 border-t border-border-default flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMuted(!isMuted)} className={clsx("p-2 sm:px-4 sm:py-2 rounded-full flex items-center gap-2", isMuted ? "bg-danger/20 text-danger" : "bg-surface-hover text-text-primary")}>
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              <span className="text-sm font-medium hidden sm:inline">{isMuted ? "Muted" : "Mic On"}</span>
            </button>
            <button onClick={() => setHandRaised(!handRaised)} className={clsx("p-2 sm:px-4 sm:py-2 rounded-full flex items-center gap-2", handRaised ? "bg-warning/20 text-warning" : "bg-surface-hover text-text-primary")}>
              <Hand size={20} />
              <span className="text-sm font-medium hidden sm:inline">{handRaised ? "Hand Raised" : "Request to Speak"}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">Quick Status:</span>
            <span className="w-3 h-3 rounded-full bg-success shadow-sm shadow-success/50"></span>
          </div>
        </div>
      )}
    </div>
  );
}
