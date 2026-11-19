import { Edit, Users } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
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

export function CreateConversationDialog() {
  const { chatList, users, createDirectChat, createGroupChat } = useMockAppState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [error, setError] = useState("");

  const existingDirectUserIds = useMemo(() => new Set(
    Object.values(chatList)
      .filter((chat) => chat.type === "direct")
      .flatMap((chat) => chat.participants),
  ), [chatList]);
  const contacts = Object.values(users);
  const newDirectContacts = contacts.filter((user) => !existingDirectUserIds.has(user.id));

  const resetAndClose = () => {
    setOpen(false);
    setError("");
    setGroupName("");
    setGroupMembers([]);
    setSelectedUserId("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "direct") {
      const userId = selectedUserId || newDirectContacts[0]?.id;
      if (!userId) {
        setError("Every contact already has a private chat.");
        return;
      }
      const chatId = createDirectChat(userId);
      resetAndClose();
      navigate(`/app/private/dm/${chatId}`);
      return;
    }

    if (!groupName.trim()) {
      setError("Give the group a name.");
      return;
    }
    if (groupMembers.length === 0) {
      setError("Choose at least one group member.");
      return;
    }

    const chatId = createGroupChat(groupName, groupMembers);
    resetAndClose();
    navigate(`/app/private/group/${chatId}`);
  };

  const toggleMember = (userId: string) => {
    setGroupMembers((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          title="New conversation"
          aria-label="Create a private chat or group"
        >
          <Edit size={18} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-clean border-border-default bg-surface-card text-text-primary sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription className="text-text-secondary">
            Start a private chat or create a private group from your prototype contacts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-background-secondary p-1" role="tablist" aria-label="Conversation type">
          {(["direct", "group"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                setMode(value);
                setError("");
              }}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === value ? "bg-surface-selected text-accent-readable" : "text-text-secondary"}`}
            >
              {value === "direct" ? "Private chat" : "Private group"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "direct" ? (
            <label className="block space-y-2">
              <span className="text-sm font-bold">Contact</span>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                aria-label="Choose a contact"
              >
                {newDirectContacts.length === 0 && <option value="">No unused contacts</option>}
                {newDirectContacts.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
          ) : (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-bold">Group name</span>
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                  placeholder="Book Club"
                  autoFocus
                />
              </label>
              <fieldset>
                <legend className="mb-2 text-sm font-bold">Members</legend>
                <div className="max-h-60 space-y-2 overflow-y-auto scrollbar-clean rounded-xl border border-border-default p-2">
                  {contacts.map((user) => (
                    <label key={user.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover">
                      <input
                        type="checkbox"
                        checked={groupMembers.includes(user.id)}
                        onChange={() => toggleMember(user.id)}
                        className="h-4 w-4 accent-[var(--accent-primary)]"
                      />
                      <span className={`h-8 w-8 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${user.avatarColor}`}>{user.initials}</span>
                      <span className="text-sm font-semibold">{user.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-readable">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetAndClose} className="rounded-xl border border-border-default px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-hover">
              Cancel
            </button>
            <button type="submit" className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-secondary flex items-center gap-2">
              <Users size={16} />
              {mode === "direct" ? "Start chat" : "Create group"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
