import { useState, useEffect } from "react";
import { useParams } from "react-router";
import {
  ClipboardList,
  Plus,
  CheckSquare,
  Square,
  Calendar,
  Lightbulb,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { clsx } from "clsx";
import { useMockAppState } from "../state/mockAppState";
import { logQaEvent } from "../qa/qaEvents";

// ─── Local data types ──────────────────────────────────────────────────────────

interface AgendaItem {
  id: string;
  title: string;
  time: string;
}

interface TaskItem {
  id: string;
  title: string;
  note: string;
  done: boolean;
}

interface TimelineEvent {
  id: string;
  date: string;
  description: string;
}

interface DecisionRecord {
  id: string;
  decision: string;
  outcome: string;
}

type TabId = "agenda" | "tasks" | "timeline" | "decisions";

const TABS: { id: TabId; label: string }[] = [
  { id: "agenda", label: "Agenda" },
  { id: "tasks", label: "Tasks" },
  { id: "timeline", label: "Timeline" },
  { id: "decisions", label: "Decisions" },
];

function uid() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Empty-state card ──────────────────────────────────────────────────────────

function EmptyCard({
  icon,
  description,
}: {
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border-default bg-surface-card px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
        {icon}
      </div>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}

// ─── Agenda tab ───────────────────────────────────────────────────────────────

function AgendaTab() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  function add() {
    if (!title.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: uid(), title: title.trim(), time: time.trim() || "TBD" },
    ]);
    setTitle("");
    setTime("");
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && !open ? (
        <EmptyCard
          icon={<Clock size={22} />}
          description="No agenda items yet. Add the first item to get started."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-border-default bg-surface-card px-4 py-3"
            >
              <span className="text-sm font-medium text-text-primary">
                {item.title}
              </span>
              <span className="ml-4 shrink-0 rounded-lg bg-accent-primary/10 px-2 py-0.5 text-xs font-semibold text-accent-primary">
                {item.time}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="rounded-xl border border-border-default bg-surface-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            New agenda item
          </p>
          <input
            className="mb-2 w-full rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            placeholder="Agenda item title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            autoFocus
          />
          <input
            className="mb-3 w-full rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            placeholder="Time (e.g. 10:00 AM) — optional"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              className="rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTitle("");
                setTime("");
              }}
              className="rounded-lg border border-border-default px-4 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 self-start rounded-xl border border-border-default bg-surface-card px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          <Plus size={15} />
          Add agenda item
        </button>
      )}
    </div>
  );
}

// ─── Tasks tab ────────────────────────────────────────────────────────────────

function TasksTab() {
  const [items, setItems] = useState<TaskItem[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  function add() {
    if (!title.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: uid(), title: title.trim(), note: note.trim(), done: false },
    ]);
    setTitle("");
    setNote("");
    setOpen(false);
  }

  function toggle(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && !open ? (
        <EmptyCard
          icon={<CheckSquare size={22} />}
          description="No tasks yet. Add tasks to track what needs to get done."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-border-default bg-surface-card px-4 py-3"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="mt-0.5 shrink-0 text-accent-primary"
                aria-label={item.done ? "Mark incomplete" : "Mark complete"}
              >
                {item.done ? <CheckSquare size={18} /> : <Square size={18} className="text-text-secondary" />}
              </button>
              <div className="min-w-0">
                <p
                  className={clsx(
                    "text-sm font-medium",
                    item.done
                      ? "text-text-secondary line-through"
                      : "text-text-primary"
                  )}
                >
                  {item.title}
                </p>
                {item.note && (
                  <p className="mt-0.5 text-xs text-text-secondary">{item.note}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="rounded-xl border border-border-default bg-surface-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            New task
          </p>
          <input
            className="mb-2 w-full rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            placeholder="Task title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            autoFocus
          />
          <input
            className="mb-3 w-full rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            placeholder="Note (optional)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              className="rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTitle("");
                setNote("");
              }}
              className="rounded-lg border border-border-default px-4 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 self-start rounded-xl border border-border-default bg-surface-card px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          <Plus size={15} />
          Add task
        </button>
      )}
    </div>
  );
}

// ─── Timeline tab ─────────────────────────────────────────────────────────────

function TimelineTab() {
  const [items, setItems] = useState<TimelineEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  function add() {
    if (!description.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: uid(), date: date.trim() || "TBD", description: description.trim() },
    ]);
    setDate("");
    setDescription("");
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && !open ? (
        <EmptyCard
          icon={<Calendar size={22} />}
          description="No timeline events yet. Propose key dates and milestones here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-border-default bg-surface-card px-4 py-3"
            >
              <span className="mt-0.5 shrink-0 rounded-lg bg-accent-primary/10 px-2 py-0.5 text-xs font-semibold text-accent-primary">
                {item.date}
              </span>
              <p className="text-sm text-text-primary">{item.description}</p>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="rounded-xl border border-border-default bg-surface-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            New timeline event
          </p>
          <input
            className="mb-2 w-full rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            placeholder="Date or timeframe (e.g. June 20)…"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            autoFocus
          />
          <input
            className="mb-3 w-full rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            placeholder="Event description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              className="rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDate("");
                setDescription("");
              }}
              className="rounded-lg border border-border-default px-4 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 self-start rounded-xl border border-border-default bg-surface-card px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          <Plus size={15} />
          Add event
        </button>
      )}
    </div>
  );
}

// ─── Decisions tab ────────────────────────────────────────────────────────────

function DecisionsTab() {
  const [items, setItems] = useState<DecisionRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState("");
  const [outcome, setOutcome] = useState("");

  function add() {
    if (!decision.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: uid(), decision: decision.trim(), outcome: outcome.trim() },
    ]);
    setDecision("");
    setOutcome("");
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && !open ? (
        <EmptyCard
          icon={<Lightbulb size={22} />}
          description="No decisions recorded yet. Log key decisions and their outcomes here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border-default bg-surface-card px-4 py-3"
            >
              <p className="text-sm font-medium text-text-primary">
                {item.decision}
              </p>
              {item.outcome && (
                <p className="mt-1 text-xs text-text-secondary">
                  <span className="font-semibold">Outcome: </span>
                  {item.outcome}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="rounded-xl border border-border-default bg-surface-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            New decision
          </p>
          <input
            className="mb-2 w-full rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            placeholder="Decision made…"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            autoFocus
          />
          <input
            className="mb-3 w-full rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            placeholder="Outcome or rationale (optional)…"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              className="rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDecision("");
                setOutcome("");
              }}
              className="rounded-lg border border-border-default px-4 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 self-start rounded-xl border border-border-default bg-surface-card px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          <Plus size={15} />
          Add decision
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlanningRoomScreen() {
  const { networkId, roomId } = useParams();
  const { networks } = useMockAppState();
  const [activeTab, setActiveTab] = useState<TabId>("agenda");

  const network = networkId ? networks[networkId] : undefined;
  const room = network?.rooms
    .flatMap((s) => s.items)
    .find((r) => r.id === roomId);

  const roomLabel = room?.name ?? roomId ?? "Planning Room";

  useEffect(() => {
    logQaEvent({
      type: "room.planning.opened",
      networkId: networkId ?? undefined,
      roomId: roomId ?? undefined,
      reason: "planning-room-opened",
    });
  }, [networkId, roomId]);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background-primary">
      {/* Header */}
      <header className="shrink-0 border-b border-border-default bg-surface-card/90 px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {/* Prototype banner */}
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <ShieldCheck size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Local-only prototype. Planning content stays on this device and is not logged or synced to diagnostics.
            </p>
          </div>

          {/* Room title row */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-primary/15 text-accent-primary">
              <ClipboardList size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-text-primary">
                {roomLabel}
              </h1>
              {network && (
                <p className="text-xs text-text-secondary">{network.name} · Planning Room</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 border-t border-border-default pt-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                  activeTab === tab.id
                    ? "bg-accent-primary text-white"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {activeTab === "agenda" && <AgendaTab />}
          {activeTab === "tasks" && <TasksTab />}
          {activeTab === "timeline" && <TimelineTab />}
          {activeTab === "decisions" && <DecisionsTab />}
        </div>
      </main>

      {/* Footer warning */}
      <footer className="shrink-0 border-t border-border-default bg-surface-card/50 px-4 py-3 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-text-secondary">
            <ShieldCheck size={12} className="text-warning" />
            Planning Rooms are a local-only prototype feature. Content is not backed up or synced.
          </p>
        </div>
      </footer>
    </div>
  );
}
