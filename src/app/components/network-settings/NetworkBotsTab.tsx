import { Bot, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMockAppState } from "../../state/mockAppState";
import { logQaEvent } from "../../qa/qaEvents";
import { loadBots, PrototypeBot, saveBots } from "../../state/networkPrototypeSettings";

/** Sample bots users can "install" to exercise the UI. None of them execute code. */
const BOT_CATALOG: Omit<PrototypeBot, "id" | "addedBy" | "addedAt" | "enabled">[] = [
  {
    name: "Welcome Bot",
    icon: "👋",
    description: "Would greet new members in a chosen Room.",
    permissions: ["Read messages", "Send messages", "View members"],
    allowedRooms: "Announcements only",
  },
  {
    name: "Check-In Reminder Bot",
    icon: "⏰",
    description: "Would post scheduled safety check-in reminders.",
    permissions: ["Send messages", "View members"],
    allowedRooms: "Check-ins only",
  },
  {
    name: "File Organizer Bot",
    icon: "🗂️",
    description: "Would tag and organize shared files.",
    permissions: ["Read messages", "Upload files"],
    allowedRooms: "All Rooms",
  },
];

export function NetworkBotsTab({ network, isOwner }: { network: any; isOwner: boolean }) {
  const { me } = useMockAppState();
  const [bots, setBots] = useState<PrototypeBot[]>(() => loadBots(network.id));
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const persist = (next: PrototypeBot[]) => {
    setBots(next);
    saveBots(network.id, next);
  };

  const handleAdd = (template: typeof BOT_CATALOG[number]) => {
    const bot: PrototypeBot = {
      ...template,
      id: `bot_${Date.now()}`,
      addedBy: me.name,
      addedAt: new Date().toISOString(),
      enabled: true,
    };
    persist([bot, ...bots]);
    setCatalogOpen(false);
    logQaEvent({ type: "network.bot.added", userId: me.id, networkId: network.id, success: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Bot size={18} className="text-accent-primary" />
          Integrations &amp; Bots
        </h2>
        {isOwner && (
          <button
            onClick={() => setCatalogOpen((previous) => !previous)}
            className="flex items-center gap-1.5 rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover"
          >
            <Plus size={15} /> {catalogOpen ? "Close" : "Add Bot (prototype)"}
          </button>
        )}
      </div>

      <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-text-secondary">
        <strong>Prototype-only:</strong> real bots do not execute yet. Adding a bot here records a
        local entry so the management UI can be tested. No bot code runs, no external webhooks fire,
        and no third-party services are contacted. See <code>docs/architecture/BOTS_AND_INTEGRATIONS_PLAN.md</code> for the sandbox plan.
      </p>

      {catalogOpen && (
        <div className="space-y-2 rounded-2xl border border-border-default bg-surface-card p-4">
          <h3 className="text-sm font-bold text-text-primary">Sample bot catalog</h3>
          {BOT_CATALOG.map((template) => (
            <div key={template.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background-secondary p-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl" aria-hidden>{template.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary">{template.name}</p>
                  <p className="truncate text-xs text-text-muted">{template.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleAdd(template)}
                disabled={bots.some((bot) => bot.name === template.name)}
                className="rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-hover disabled:opacity-40"
              >
                {bots.some((bot) => bot.name === template.name) ? "Installed" : "Install"}
              </button>
            </div>
          ))}
        </div>
      )}

      {bots.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-surface-card p-8 text-center">
          <Bot size={26} className="mx-auto mb-2 text-text-muted" />
          <p className="text-sm font-bold text-text-primary">No bots installed</p>
          <p className="mt-1 text-xs text-text-secondary">
            {isOwner ? "Use “Add Bot (prototype)” to install a sample bot and explore the permission preview." : "The Network owner can install prototype bots here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bots.map((bot) => (
            <div key={bot.id} className="rounded-2xl border border-border-default bg-surface-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl" aria-hidden>{bot.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary flex items-center gap-2">
                      {bot.name}
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${bot.enabled ? "bg-success/15 text-success" : "bg-surface-hover text-text-muted"}`}>
                        {bot.enabled ? "Enabled (mock)" : "Disabled"}
                      </span>
                    </p>
                    <p className="text-xs text-text-muted">
                      Added by {bot.addedBy} · {new Date(bot.addedAt).toLocaleDateString()} · Rooms: {bot.allowedRooms}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <label className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                      <input
                        type="checkbox"
                        checked={bot.enabled}
                        onChange={(event) => persist(bots.map((entry) => entry.id === bot.id ? { ...entry, enabled: event.target.checked } : entry))}
                      />
                      Enabled
                    </label>
                  )}
                  {isOwner && (
                    confirmRemoveId === bot.id ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-danger">Remove?</span>
                        <button
                          onClick={() => { persist(bots.filter((entry) => entry.id !== bot.id)); setConfirmRemoveId(null); logQaEvent({ type: "network.bot.removed", userId: me.id, networkId: network.id, success: true }); }}
                          className="rounded-lg bg-danger px-2.5 py-1 text-[11px] font-bold text-white"
                        >
                          Yes
                        </button>
                        <button onClick={() => setConfirmRemoveId(null)} className="rounded-lg border border-border-default px-2.5 py-1 text-[11px] font-bold text-text-secondary">
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(bot.id)}
                        aria-label={`Remove bot ${bot.name}`}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Permissions requested (preview only)</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {bot.permissions.map((permission) => (
                    <span key={permission} className="rounded bg-background-secondary px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-muted">
        No arbitrary code execution, external webhooks, or unreviewed plugins are allowed in this prototype stage.
      </p>
    </div>
  );
}
