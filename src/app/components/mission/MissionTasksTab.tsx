import React from 'react';
import { useMissionState } from '../../state/missionState';
import { CalendarDays, UserRound, Bell, Repeat, CheckCircle2, ListTodo } from 'lucide-react';
import { clsx } from 'clsx';
import { useMockAppState } from '../../state/mockAppState';

interface MissionTasksTabProps {
  missionId: string;
}

export function MissionTasksTab({ missionId }: MissionTasksTabProps) {
  const { missions, toggleTask, addTask } = useMissionState();
  const { users, me } = useMockAppState();
  const mission = missions[missionId];
  const [taskDraft, setTaskDraft] = React.useState('');

  if (!mission) return null;

  const userName = (id: string) => (id === me.id ? me.name : users[id]?.name || id);

  return (
    <section className="space-y-4">
      <form 
        onSubmit={(e) => { e.preventDefault(); if (taskDraft.trim()) { addTask(missionId, taskDraft.trim()); setTaskDraft(""); } }}
        className="flex gap-2"
      >
        <input 
          value={taskDraft}
          onChange={e => setTaskDraft(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        />
        <button type="submit" className="rounded-xl bg-accent-secondary px-4 py-2 text-sm font-bold text-white hover:opacity-90">Add</button>
      </form>
      {mission.tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default p-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-hover text-text-muted">
            <ListTodo size={24} />
          </div>
          <h3 className="text-sm font-bold text-text-primary">No tasks yet</h3>
          <p className="mt-1 text-xs text-text-secondary">Add tasks to track mission progress.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {mission.tasks.map((task) => (
            <li key={task.id}>
              <div className={clsx(
                "rounded-xl border p-3 transition-colors",
                task.done ? "border-border-default bg-surface-hover opacity-75" : "border-border-default bg-surface-card hover:bg-surface-hover"
              )}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(missionId, task.id)}
                      className="h-5 w-5 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={clsx("text-sm font-bold", task.done ? "text-text-muted line-through" : "text-text-primary")}>
                        {task.label}
                      </span>
                      {task.status && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-border-default bg-background-secondary text-text-secondary">
                          {task.status}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {task.priority && (
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                          task.priority === "critical" ? "bg-danger/10 text-danger-readable border-danger/20" :
                          task.priority === "high" ? "bg-amber-600/10 text-amber-600 border-amber-600/20" :
                          task.priority === "medium" ? "bg-accent-primary/10 text-accent-readable border-accent-primary/20" :
                          "bg-surface-hover text-text-secondary border-border-default"
                        )}>
                          {task.priority} Priority
                        </span>
                      )}

                      {task.assigneeId && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-accent-readable bg-accent-primary/10 px-2 py-0.5 rounded border border-accent-primary/20">
                          <UserRound size={12} /> {userName(task.assigneeId)}
                        </span>
                      )}

                      {task.dueTime && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-text-secondary bg-background-secondary px-2 py-0.5 rounded border border-border-default">
                          <CalendarDays size={12} /> {task.dueTime}
                        </span>
                      )}

                      {task.scheduled && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-600/10 px-2 py-0.5 rounded border border-indigo-600/20" title="Reminder label only / Notification delivery planned">
                          <Bell size={12} /> Scheduled (Reminder label only / Notification delivery planned)
                        </span>
                      )}

                      {task.repeatLabel && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-text-secondary bg-surface-hover px-2 py-0.5 rounded border border-border-default">
                          <Repeat size={12} /> {task.repeatLabel}
                        </span>
                      )}
                    </div>
                    
                    {task.completedAt && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-text-muted">
                        <CheckCircle2 size={12} className="text-success" />
                        Completed at {new Date(Number(task.completedAt)).toLocaleString()}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
