import { Plus } from "lucide-react";
import { FormEvent, useState } from "react";
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

export function CreateRoomDialog({
  networkId,
  defaultCategory,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: {
  networkId: string;
  defaultCategory?: string;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { networks, createRoom } = useMockAppState();
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled && controlledOnOpenChange ? controlledOnOpenChange : setInternalOpen;
  
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const network = networks[networkId];
  const [category, setCategory] = useState(defaultCategory || network?.rooms[0]?.category || "Rooms");
  const [type, setType] = useState<"text" | "announcement" | "check-in" | "vault" | "voice" | "video" | "mission" | "planning">("text");
  const [visibility, setVisibility] = useState<"public" | "private" | "restricted" | "opsec">("public");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give the room a name.");
      return;
    }
    const roomId = createRoom(networkId, name, category, type, visibility);
    if (!roomId) {
      setError("That Network is no longer available.");
      return;
    }
    setName("");
    setType("text");
    setError("");
    setOpen(false);
    navigate(`/app/network/${networkId}/room/${roomId}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <button className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover hover:text-accent-primary" title="Add room" aria-label={`Add a room to ${network?.name || "Network"}`}>
            <Plus size={18} />
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="border-border-default bg-surface-card text-text-primary sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add a room</DialogTitle>
          <DialogDescription className="text-text-secondary">
            Create a text room inside {network?.name || "this Network"}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold">Room name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Volunteer Plans"
              autoFocus
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            >
              {network?.rooms.map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">Room type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            >
              <option value="text">Text chat</option>
              <option value="announcement">Announcements</option>
              <option value="check-in">Check-ins</option>
              <option value="vault">File Vault</option>
              <option value="voice">Voice room</option>
              <option value="video">Video room</option>
              <option value="mission">Mission Room (local prototype)</option>
              <option value="planning">Planning Room (local prototype)</option>
            </select>
          </label>
          {(type === "mission" || type === "planning") && (
            <p className="text-[11px] text-text-secondary">
              {type === "mission" ? "Mission Rooms" : "Planning Rooms"} are local-only prototype room types. No real GPS, dispatch, or external services are connected.
            </p>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-bold">Visibility</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            >
              <option value="public">Public (All Network Members)</option>
              <option value="private">Private (Specific Roles)</option>
              <option value="restricted">Restricted (Hidden from non-members)</option>
              <option value="opsec">OPSEC Restricted (Hidden, strict vetting)</option>
            </select>
          </label>
          
          <div className="text-[11px] text-text-secondary bg-surface-hover rounded-lg p-3">
            {visibility === "public" && "Everyone in the Network can see and join this room."}
            {visibility === "private" && "Only members with specific roles can see and join this room."}
            {visibility === "restricted" && "Room is hidden from the Room list unless you have access."}
            {visibility === "opsec" && "OPSEC mode is a local prototype label and does not provide production-grade security."}
          </div>

          {error && <p role="alert" className="text-sm text-danger-readable">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border-default px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-hover">Cancel</button>
            <button type="submit" className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-secondary">Add room</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
