import { Copy, LogOut, Settings2, Trash2, UserPlus } from "lucide-react";
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

export function ManageGroupDialog({ chatId }: { chatId: string }) {
  const {
    me,
    chatList,
    users,
    invitations,
    renameGroupChat,
    updateGroupMembers,
    leaveGroupChat,
    deleteGroupChat,
    createInvitation,
  } = useMockAppState();
  const navigate = useNavigate();
  const group = chatList[chatId];
  const isOwner = group?.ownerId === me.id;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group?.name || "");
  const [members, setMembers] = useState(group?.participants.filter((id) => id !== "user_me") || []);
  const [notice, setNotice] = useState("");
  const invite = invitations.find((item) => item.targetType === "group" && item.targetId === chatId);

  useEffect(() => {
    if (!open || !group) return;
    setName(group.name || "");
    setMembers(group.participants.filter((id) => id !== "user_me"));
    setNotice("");
  }, [open, group]);

  if (!group || group.type !== "group") return null;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNotice("Give the group a name.");
      return;
    }
    renameGroupChat(chatId, name);
    updateGroupMembers(chatId, members);
    setNotice("Group details saved locally.");
  };

  const generateInvite = () => {
    createInvitation("group", chatId);
    setNotice("A new local prototype invitation code was created.");
  };

  const copyInvite = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      setNotice("Invitation code copied.");
    } catch {
      setNotice("Copy is unavailable. Select the invitation code manually.");
    }
  };

  const leave = () => {
    if (!window.confirm(`Leave "${group.name}" on this local profile? Its local history will be retained.`)) return;
    leaveGroupChat(chatId);
    setOpen(false);
    navigate("/app/private/dm/chat_sarah");
  };

  const remove = () => {
    if (!window.confirm(`Delete "${group.name}" and its local message history?`)) return;
    deleteGroupChat(chatId);
    setOpen(false);
    navigate("/app/private/dm/chat_sarah");
  };

  return (
    <ManageDialogShell
      open={open}
      onOpenChange={setOpen}
      triggerLabel={`Manage ${group.name}`}
      title="Group settings"
      description={isOwner ? "Rename the group, update local prototype members, or create an invitation code." : "View group settings or leave."}
    >
      <form onSubmit={save} className="space-y-4">
        <NameField label="Group name" value={name} onChange={setName} disabled={!isOwner} />
        {isOwner && <MemberPicker selected={members} onChange={setMembers} users={users} />}
        {isOwner && <InvitePanel inviteCode={invite?.code} onGenerate={generateInvite} onCopy={copyInvite} />}
        {notice && <p role="status" className="rounded-xl bg-accent-primary/10 px-3 py-2 text-xs text-accent-readable">{notice}</p>}
        <div className="flex flex-wrap justify-between gap-2 border-t border-border-default pt-4">
          <div className="flex gap-2">
            <DangerButton onClick={leave} label="Leave group" icon={<LogOut size={15} />} />
            {isOwner && <DangerButton onClick={remove} label="Delete group" icon={<Trash2 size={15} />} />}
          </div>
          {isOwner && <button type="submit" className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-secondary">Save changes</button>}
        </div>
      </form>
    </ManageDialogShell>
  );
}

export function ManageNetworkDialog({ networkId }: { networkId: string }) {
  const {
    me,
    networks,
    users,
    invitations,
    renameNetwork,
    updateNetworkMembers,
    leaveNetwork,
    deleteNetwork,
    createInvitation,
  } = useMockAppState();
  const navigate = useNavigate();
  const network = networks[networkId];
  const isOwner = network?.ownerId === me.id;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(network?.name || "");
  const [members, setMembers] = useState(network?.memberIds?.filter((id) => id !== "user_me") || []);
  const [notice, setNotice] = useState("");
  const invite = invitations.find((item) => item.targetType === "network" && item.targetId === networkId);

  useEffect(() => {
    if (!open || !network) return;
    setName(network.name);
    setMembers(network.memberIds?.filter((id) => id !== "user_me") || []);
    setNotice("");
  }, [open, network]);

  if (!network) return null;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNotice("Give the Network a name.");
      return;
    }
    renameNetwork(networkId, name);
    updateNetworkMembers(networkId, members);
    setNotice("Network details saved locally.");
  };

  const generateInvite = () => {
    createInvitation("network", networkId);
    setNotice("A new local prototype invitation code was created.");
  };

  const copyInvite = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      setNotice("Invitation code copied.");
    } catch {
      setNotice("Copy is unavailable. Select the invitation code manually.");
    }
  };

  const leave = () => {
    if (!window.confirm(`Leave "${network.name}" on this local profile? Its room history will be retained.`)) return;
    leaveNetwork(networkId);
    setOpen(false);
    navigate("/app");
  };

  const remove = () => {
    if (!window.confirm(`Delete "${network.name}" and all of its local room history?`)) return;
    deleteNetwork(networkId);
    setOpen(false);
    navigate("/app");
  };

  return (
    <ManageDialogShell
      open={open}
      onOpenChange={setOpen}
      triggerLabel={`Manage ${network.name}`}
      title="Network settings"
      description={isOwner ? "Rename the Network, update local prototype members, or create an invitation code." : "View network settings or leave."}
    >
      <form onSubmit={save} className="space-y-4">
        <NameField label="Network name" value={name} onChange={setName} disabled={!isOwner} />
        {isOwner && <MemberPicker selected={members} onChange={setMembers} users={users} />}
        {isOwner && <InvitePanel inviteCode={invite?.code} onGenerate={generateInvite} onCopy={copyInvite} />}
        {notice && <p role="status" className="rounded-xl bg-accent-primary/10 px-3 py-2 text-xs text-accent-readable">{notice}</p>}
        <div className="flex flex-wrap justify-between gap-2 border-t border-border-default pt-4">
          <div className="flex gap-2">
            <DangerButton onClick={leave} label="Leave Network" icon={<LogOut size={15} />} />
            {isOwner && <DangerButton onClick={remove} label="Delete Network" icon={<Trash2 size={15} />} />}
          </div>
          {isOwner && <button type="submit" className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-secondary">Save changes</button>}
        </div>
      </form>
    </ManageDialogShell>
  );
}

function ManageDialogShell({
  open,
  onOpenChange,
  triggerLabel,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="rounded-full border border-border-default bg-background-secondary p-2.5 text-text-secondary hover:bg-surface-hover hover:text-accent-primary" aria-label={triggerLabel} title={triggerLabel}>
          <Settings2 size={19} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-clean border-border-default bg-surface-card text-text-primary sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-text-secondary">{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function NameField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold">{label}</span>
      <input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 disabled:opacity-50" />
    </label>
  );
}

function MemberPicker({
  selected,
  onChange,
  users,
}: {
  selected: string[];
  onChange: (members: string[]) => void;
  users: ReturnType<typeof useMockAppState>["users"];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">Members</legend>
      <p className="mb-2 text-xs text-text-muted">You remain a member of this local prototype space.</p>
      <div className="max-h-52 space-y-1 overflow-y-auto scrollbar-clean rounded-xl border border-border-default p-2">
        {Object.values(users).map((user) => (
          <label key={user.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover">
            <input
              type="checkbox"
              checked={selected.includes(user.id)}
              onChange={() => onChange(selected.includes(user.id) ? selected.filter((id) => id !== user.id) : [...selected, user.id])}
              className="h-4 w-4 accent-[var(--accent-primary)]"
            />
            <span className={`h-8 w-8 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${user.avatarColor}`}>{user.initials}</span>
            <span className="text-sm font-semibold">{user.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function InvitePanel({ inviteCode, onGenerate, onCopy }: { inviteCode?: string; onGenerate: () => void; onCopy: () => void }) {
  return (
    <section className="rounded-xl border border-border-default bg-background-secondary p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">Prototype invitation</p>
          <p className="text-xs text-text-muted">Local demonstration code only. No invitation is transmitted.</p>
        </div>
        <button type="button" onClick={onGenerate} className="rounded-lg border border-border-default px-3 py-2 text-xs font-bold hover:bg-surface-hover flex items-center gap-1.5">
          <UserPlus size={14} />
          {inviteCode ? "Regenerate" : "Create code"}
        </button>
      </div>
      {inviteCode && (
        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 select-all rounded-lg bg-background-primary px-3 py-2 text-xs font-bold text-accent-readable">{inviteCode}</code>
          <button type="button" onClick={onCopy} className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover" aria-label="Copy invitation code"><Copy size={16} /></button>
        </div>
      )}
    </section>
  );
}

function DangerButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-danger/40 px-3 py-2 text-xs font-bold text-danger-readable hover:bg-danger/10 flex items-center gap-1.5">
      {icon}
      {label}
    </button>
  );
}
