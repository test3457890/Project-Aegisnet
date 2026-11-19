import { Archive, ArrowDown, ArrowUp, Settings2, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useMockAppState } from "../state/mockAppState";

export function ManageRoomDialog({ networkId, roomId }: { networkId: string; roomId: string }) {
  const {
    networks,
    renameRoom,
    moveRoom,
    moveRoomToCategory,
    setRoomArchived,
    deleteRoom,
  } = useMockAppState();
  const navigate = useNavigate();
  const network = networks[networkId];
  const room = network?.rooms.flatMap((section) => section.items).find((item) => item.id === roomId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(room?.name || "");
  const currentCategory = network?.rooms.find((c) => c.items.some((r) => r.id === roomId))?.category || "";
  const [category, setCategory] = useState(currentCategory);

  useEffect(() => {
    if (open && room) setName(room.name);
    if (open && currentCategory) setCategory(currentCategory);
  }, [open, room, currentCategory]);

  if (!network || !room) return null;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (name !== room.name) renameRoom(networkId, roomId, name);
    if (category !== currentCategory) moveRoomToCategory(networkId, roomId, category);
    setOpen(false);
  };

  const fallbackRoom = network.rooms.flatMap((section) => section.items).find((item) => item.id !== roomId && !item.archived);

  const archive = () => {
    setRoomArchived(networkId, roomId, !room.archived);
    setOpen(false);
    if (!room.archived && fallbackRoom) navigate(`/app/network/${networkId}/room/${fallbackRoom.id}`);
  };

  const remove = () => {
    if (!window.confirm(`Delete "${room.name}" and its local message history?`)) return;
    deleteRoom(networkId, roomId);
    setOpen(false);
    navigate(fallbackRoom ? `/app/network/${networkId}/room/${fallbackRoom.id}` : "/app");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary" aria-label={`Manage room ${room.name}`}>
          <Settings2 size={14} />
        </button>
      </DialogTrigger>
      <DialogContent className="border-border-default bg-surface-card text-text-primary sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Room settings</DialogTitle>
          <DialogDescription className="text-text-secondary">Rename, reorder, archive, or delete this local prototype room.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold">Room name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} autoFocus className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30">
              {network.rooms.map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => moveRoom(networkId, roomId, "up")} className="rounded-xl border border-border-default px-3 py-2 text-xs font-bold hover:bg-surface-hover flex items-center justify-center gap-2"><ArrowUp size={15} /> Move up</button>
            <button type="button" onClick={() => moveRoom(networkId, roomId, "down")} className="rounded-xl border border-border-default px-3 py-2 text-xs font-bold hover:bg-surface-hover flex items-center justify-center gap-2"><ArrowDown size={15} /> Move down</button>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-border-default pt-4">
            <div className="flex gap-2">
              <button type="button" onClick={archive} className="rounded-xl border border-warning/30 px-3 py-2 text-xs font-bold text-warning hover:bg-warning/10 flex items-center gap-1.5"><Archive size={15} /> {room.archived ? "Restore" : "Archive"}</button>
              <button type="button" onClick={remove} className="rounded-xl border border-danger/40 px-3 py-2 text-xs font-bold text-danger-readable hover:bg-danger/10 flex items-center gap-1.5"><Trash2 size={15} /> Delete</button>
            </div>
            <button type="submit" className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-secondary">Save name</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
