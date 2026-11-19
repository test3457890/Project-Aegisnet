import { Archive, FolderLock, Hash, Target, Volume2, ChevronDown, ChevronRight, Video, Calendar, Bell, MapPin, Settings, ShieldCheck, Plus, Edit2, Trash2, MoreHorizontal, ArrowUp, ArrowDown, Lock } from "lucide-react";
import { NavLink, useParams } from "react-router";
import { clsx } from "clsx";
import { useMockAppState, hasNetworkPermission } from "../state/mockAppState";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { ManageNetworkDialog } from "./ManageSpaceDialog";
import { ManageRoomDialog } from "./ManageRoomDialog";
import { useState, useEffect } from "react";
import { canViewRoom } from "../data/mockNetworks";
import { ActionMenu } from "./ui/ActionMenu";

export function RoomsSidebar() {
  const { networkId, roomId, missionId, callId } = useParams();
  const { me, networks, networkProfiles, setSelectedNetworkId, setSelectedRoomId, createCategory, renameCategory, deleteCategory, reorderCategory, reorderRoom, moveCategory } = useMockAppState();
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(`aegisnet_collapsed_${networkId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [createRoomCategory, setCreateRoomCategory] = useState<string>("");

  const [draggedRoom, setDraggedRoom] = useState<{ id: string, category: string } | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<{ id: string, category: string } | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(`aegisnet_collapsed_${networkId}`, JSON.stringify(collapsedCategories));
    } catch {}
  }, [collapsedCategories, networkId]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSectionName.trim()) {
      createCategory(networkId as string, newSectionName.trim());
      setNewSectionName("");
      setIsAddingSection(false);
    }
  };

  const handleRenameCategory = (e: React.FormEvent, oldName: string) => {
    e.preventDefault();
    if (editValue.trim() && editValue !== oldName) {
      renameCategory(networkId as string, oldName, editValue.trim());
    }
    setEditingCategory(null);
  };

  if (!networkId || !networks[networkId]) return null;
  const network = networks[networkId];
  const profile = networkProfiles[networkId] || {};
  const canManageRooms = hasNetworkPermission(network, me.id, "manage_rooms");

  const handleDeleteCategory = (category: string) => {
    const cat = network.rooms.find(c => c.category === category);
    if (!cat) return;
    if (cat.items.length === 0) {
      if (window.confirm(`Delete section "${category}"?`)) {
        deleteCategory(networkId, category);
      }
    } else {
      const fallback = network.rooms.find(c => c.category !== category)?.category;
      if (!fallback) {
        alert("Cannot delete the only section when it contains rooms.");
        return;
      }
      if (window.confirm(`Delete section "${category}"? Its rooms will be moved to "${fallback}".`)) {
        deleteCategory(networkId, category, fallback);
      }
    }
  };

  const handleCategoryDragStart = (e: React.DragEvent, category: string) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCategoryDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedCategory && draggedCategory !== category) {
      setDragOverCategory(category);
    } else if (draggedRoom) {
      setDragOverCategory(category);
    }
  };

  const handleCategoryDrop = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    if (draggedCategory && draggedCategory !== category) {
      const fromIndex = network.rooms.findIndex(c => c.category === draggedCategory);
      const toIndex = network.rooms.findIndex(c => c.category === category);
      if (fromIndex >= 0 && toIndex >= 0 && reorderCategory) {
        reorderCategory(networkId, fromIndex, toIndex);
      }
    } else if (draggedRoom && draggedRoom.category !== category) {
      // dropped room into an empty category space
      const targetCategoryObj = network.rooms.find(c => c.category === category);
      if (targetCategoryObj && reorderRoom) {
        reorderRoom(networkId, draggedRoom.category, draggedRoom.id, category, targetCategoryObj.items.length);
      }
    }
    setDraggedCategory(null);
    setDragOverCategory(null);
    setDraggedRoom(null);
    setDragOverRoom(null);
  };

  const handleRoomDragStart = (e: React.DragEvent, room: { id: string, category: string }) => {
    e.stopPropagation();
    setDraggedRoom(room);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleRoomDragOver = (e: React.DragEvent, room: { id: string, category: string }) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedRoom && draggedRoom.id !== room.id) {
      setDragOverRoom(room);
    }
  };

  const handleRoomDrop = (e: React.DragEvent, room: { id: string, category: string }) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedRoom && draggedRoom.id !== room.id) {
      const targetCategoryObj = network.rooms.find(c => c.category === room.category);
      if (targetCategoryObj && reorderRoom) {
        const toIndex = targetCategoryObj.items.findIndex(r => r.id === room.id);
        if (toIndex >= 0) {
          reorderRoom(networkId, draggedRoom.category, draggedRoom.id, room.category, toIndex);
        }
      }
    }
    setDraggedRoom(null);
    setDragOverRoom(null);
    setDragOverCategory(null);
  };

  const handleDragEnd = () => {
    setDraggedCategory(null);
    setDragOverCategory(null);
    setDraggedRoom(null);
    setDragOverRoom(null);
  };

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border-default bg-background-secondary md:flex">
      <div className="shrink-0 border-b border-border-default px-4 py-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-text-primary hover:underline">
              <NavLink to={`/app/network/${networkId}/settings`}>{network.name}</NavLink>
            </h2>
          </div>
          <div className="flex items-center">
            {canManageRooms && (
              <ActionMenu
                trigger={
                  <button className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary" title="Add to Network">
                    <Plus size={16} />
                  </button>
                }
                items={[
                  { label: "Room", icon: <Hash size={14} />, onClick: () => { setCreateRoomCategory(network.rooms[0]?.category || ""); setCreateRoomOpen(true); } },
                  { label: "Section", icon: <FolderLock size={14} />, onClick: () => setIsAddingSection(true) }
                ]}
              />
            )}
            <ManageNetworkDialog networkId={networkId} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-success">
          <ShieldCheck size={12} />
          <span>Local Prototype Trust</span>
        </div>
      </div>
      
      <CreateRoomDialog networkId={networkId} defaultCategory={createRoomCategory} open={createRoomOpen} onOpenChange={setCreateRoomOpen} />

      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-clean p-3" onDragOver={(e) => e.preventDefault()} onDrop={handleDragEnd}>
        {isAddingSection && (
          <form onSubmit={handleCreateCategory} className="mb-2 flex items-center px-2">
            <input
              autoFocus
              type="text"
              placeholder="New section name"
              className="w-full rounded bg-surface-hover px-2 py-1 text-xs text-text-primary outline-none"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onBlur={() => setIsAddingSection(false)}
            />
          </form>
        )}
        {network.rooms.map((section) => {
          const isCollapsed = collapsedCategories[section.category];
          const isDragOverCat = dragOverCategory === section.category && (!draggedRoom || draggedRoom.category !== section.category);
          
          return (
            <section 
              key={section.category}
              draggable
              onDragStart={(e) => handleCategoryDragStart(e, section.category)}
              onDragOver={(e) => handleCategoryDragOver(e, section.category)}
              onDragLeave={() => setDragOverCategory(null)}
              onDrop={(e) => handleCategoryDrop(e, section.category)}
              onDragEnd={handleDragEnd}
              className={clsx(
                "rounded-md transition-colors",
                isDragOverCat && "border-t-2 border-t-accent-primary bg-surface-hover/30"
              )}
            >
              <div className="group flex items-center justify-between mb-1 pr-2">
                {editingCategory === section.category ? (
                  <form onSubmit={(e) => handleRenameCategory(e, section.category)} className="flex-1 px-2">
                    <input
                      autoFocus
                      type="text"
                      className="w-full bg-surface-hover px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-primary outline-none"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => setEditingCategory(null)}
                    />
                  </form>
                ) : (
                  <button 
                    className="flex flex-1 items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-text-primary"
                    onClick={() => setCollapsedCategories(prev => ({ ...prev, [section.category]: !prev[section.category] }))}
                  >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    {section.category}
                  </button>
                )}
                {!editingCategory && canManageRooms && (
                  <div className="hidden items-center group-hover:flex">
                    <ActionMenu
                      trigger={
                        <button className="text-text-muted hover:text-text-primary p-0.5 rounded hover:bg-surface-hover" title="Section options"><MoreHorizontal size={12} /></button>
                      }
                      items={[
                        { label: "Add room here", icon: <Plus size={14} />, onClick: () => { setCreateRoomCategory(section.category); setCreateRoomOpen(true); } },
                        { label: "", onClick: () => {}, separator: true },
                        { label: "Rename section", icon: <Edit2 size={14} />, onClick: () => { setEditingCategory(section.category); setEditValue(section.category); } },
                        { label: "Move section up", icon: <ArrowUp size={14} />, onClick: () => moveCategory(networkId, section.category, "up") },
                        { label: "Move section down", icon: <ArrowDown size={14} />, onClick: () => moveCategory(networkId, section.category, "down") },
                        { label: "", onClick: () => {}, separator: true },
                        { label: "Delete section", icon: <Trash2 size={14} />, danger: true, onClick: () => handleDeleteCategory(section.category) }
                      ]}
                    />
                  </div>
                )}
              </div>
              
              {!isCollapsed && (
                <div className="space-y-1 pb-1 min-h-[4px]">
                  {section.items.filter((room) => !room.archived && canViewRoom(room, me.id, network || {})).map((room) => {
                    let Icon = Hash;
                    if (room.type === "vault" || room.name === "File Vault") Icon = FolderLock;
                    else if (room.type === "mission" || room.name === "Mission Room") Icon = Target;
                    else if (room.type === "voice") Icon = Volume2;
                    else if (room.type === "video") Icon = Video;
                    else if (room.type === "planning") Icon = Calendar;
                    else if (room.type === "announcement") Icon = Bell;
                    else if (room.type === "check-in") Icon = MapPin;

                    const path = room.type === "vault" || room.name === "File Vault"
                      ? "/app/vault"
                      : room.type === "mission" || room.name === "Mission Room"
                        ? `/app/network/${networkId}/mission/${room.id}`
                        : room.type === "voice" || room.type === "video"
                          ? `/app/network/${networkId}/room/${room.id}/call/${room.type}`
                          : `/app/network/${networkId}/room/${room.id}`;
                    const active = roomId === room.id || missionId === room.id || callId === room.id;
                    const isDragOver = dragOverRoom?.id === room.id;

                    return (
                      <div 
                        key={room.id} 
                        draggable
                        onDragStart={(e) => handleRoomDragStart(e, { id: room.id, category: section.category })}
                        onDragOver={(e) => handleRoomDragOver(e, { id: room.id, category: section.category })}
                        onDragLeave={() => setDragOverRoom(null)}
                        onDrop={(e) => handleRoomDrop(e, { id: room.id, category: section.category })}
                        onDragEnd={handleDragEnd}
                        className={clsx(
                        "relative flex items-center rounded-lg border transition-colors",
                        active
                          ? "border-accent-primary/50 bg-surface-selected text-text-primary"
                          : "border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                        isDragOver && "border-t-2 border-t-accent-primary bg-surface-hover/30"
                      )}>
                        {active && <span className="absolute left-0 h-5 w-[3px] rounded-r-full bg-accent-primary" />}
                        <NavLink
                          to={path}
                          onClick={() => {
                            setSelectedNetworkId(networkId);
                            setSelectedRoomId(room.id);
                          }}
                          className="flex min-w-0 flex-1 items-center justify-between px-2 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <Icon size={17} className="shrink-0" />
                            <span className="truncate text-sm font-medium">{room.name}</span>
                          </div>
                          {room.unread && room.unread > 0 && (
                            <span className="rounded-full bg-accent-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{room.unread}</span>
                          )}
                          {(room.visibility === "restricted" || room.visibility === "opsec") && (
                            <Lock size={10} className="ml-auto shrink-0 text-text-secondary opacity-60" />
                          )}
                        </NavLink>
                        <ManageRoomDialog networkId={networkId} roomId={room.id} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {network.rooms.some((section) => section.items.some((room) => room.archived)) && (
          <section>
            <h3 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Archived</h3>
            <div className="space-y-1">
              {network.rooms.flatMap((section) => section.items).filter((room) => room.archived).map((room) => (
                <div key={room.id} className="flex items-center gap-2 rounded-lg border border-dashed border-border-default px-2 py-2 text-text-muted">
                  <Archive size={15} />
                  <span className="min-w-0 flex-1 truncate text-sm">{room.name}</span>
                  <ManageRoomDialog networkId={networkId} roomId={room.id} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="h-16 shrink-0 border-t border-border-default px-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-full text-xs font-bold text-white flex items-center justify-center ${profile.avatarColor || me.avatarColor}`}>{profile.displayName ? profile.displayName.substring(0,2).toUpperCase() : me.initials}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-text-primary">{profile.displayName || me.name}</p>
          <p className="text-xs text-text-muted truncate">{profile.role || profile.status || "Available"}</p>
        </div>
        <NavLink to="/app/settings" aria-label="Settings" title="Settings" className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary">
          <Settings size={17} />
        </NavLink>
      </div>
    </aside>
  );
}
