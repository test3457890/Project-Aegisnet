import { useState } from "react";
import { Hash, Settings, ChevronDown, ChevronRight, Lock, Target, ClipboardList, Mic, Video, FolderLock, Megaphone, ActivitySquare } from "lucide-react";
import type { MockNetwork, MockRoom } from "../../data/mockNetworks";
import { RoomPermissionsEditor } from "../RoomPermissionsEditor";

function RoomTypeIcon({ type }: { type: MockRoom["type"] }) {
  const cls = "shrink-0 text-text-muted";
  switch (type) {
    case "mission":      return <Target size={16} className={cls} />;
    case "planning":     return <ClipboardList size={16} className={cls} />;
    case "voice":        return <Mic size={16} className={cls} />;
    case "video":        return <Video size={16} className={cls} />;
    case "vault":        return <FolderLock size={16} className={cls} />;
    case "announcement": return <Megaphone size={16} className={cls} />;
    case "check-in":     return <ActivitySquare size={16} className={cls} />;
    default:             return <Hash size={16} className={cls} />;
  }
}

export function NetworkRoomsTab({ network, isOwner }: { network: MockNetwork; isOwner: boolean }) {
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const allRooms = network.rooms.flatMap(section => section.items);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-default bg-surface-card p-6">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Hash size={20} className="text-accent-readable" />
          Network Rooms
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Manage rooms in this Network. Only owners and admins can edit room permissions.
        </p>

        <div className="mt-6 space-y-4">
          {allRooms.map((room) => {
            const isEditing = editingRoomId === room.id;
            return (
              <div key={room.id} className="overflow-hidden rounded-xl border border-border-default bg-background-secondary">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-hover/50 transition-colors"
                  onClick={() => setEditingRoomId(isEditing ? null : room.id)}
                >
                  <div className="flex items-center gap-3">
                    <RoomTypeIcon type={room.type} />
                    <span className="font-semibold text-text-primary">{room.name}</span>
                    {room.visibility && room.visibility !== "public" && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        room.visibility === "opsec" ? "bg-danger/10 text-danger" :
                        room.visibility === "restricted" ? "bg-warning/10 text-warning" :
                        "bg-border-default text-text-secondary"
                      }`}>
                        {room.visibility}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1.5 text-xs font-bold text-accent-readable hover:text-accent-hover transition-colors">
                      <Settings size={14} />
                      Edit Permissions
                    </button>
                    {isEditing ? <ChevronDown size={18} className="text-text-muted" /> : <ChevronRight size={18} className="text-text-muted" />}
                  </div>
                </div>
                
                {isEditing && (
                  <div className="border-t border-border-default p-4 bg-background-primary">
                    <RoomPermissionsEditor 
                      networkId={network.id} 
                      roomId={room.id} 
                      onClose={() => setEditingRoomId(null)} 
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
