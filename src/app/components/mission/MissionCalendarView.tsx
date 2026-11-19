import React from 'react';
import { useMissionState } from '../../state/missionState';
import { CalendarDays, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface MissionCalendarViewProps {
  missionId: string;
}

const typeStyles: Record<string, { label: string; className: string }> = {
  briefing: { label: "Briefing", className: "text-indigo-600 bg-indigo-600/10 border-indigo-600/20" },
  milestone: { label: "Milestone", className: "text-success bg-success/10 border-success/20" },
  deadline: { label: "Deadline", className: "text-danger-readable bg-danger/10 border-danger/20" },
  general: { label: "General", className: "text-accent-readable bg-accent-primary/10 border-accent-primary/20" },
};

export function MissionCalendarView({ missionId }: MissionCalendarViewProps) {
  const { missions } = useMissionState();
  const mission = missions[missionId];

  if (!mission) return null;

  return (
    <div className="space-y-4">
      {mission.calendarEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default p-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-hover text-text-muted">
            <CalendarDays size={24} />
          </div>
          <h3 className="text-sm font-bold text-text-primary">No scheduled events</h3>
          <p className="mt-1 text-xs text-text-secondary">Calendar events for this mission will appear here in a timeline.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-border-default ml-4 space-y-6 pb-4">
          {mission.calendarEvents.map((event) => {
            const style = typeStyles[event.type] || typeStyles.general;
            return (
              <div key={event.id} className="relative pl-6">
                {/* Timeline Dot */}
                <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-surface-card bg-accent-primary"></div>
                
                <div className="rounded-2xl border border-border-default bg-surface-card p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className={clsx("rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", style.className)}>
                      {style.label}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
                      <Clock size={12} />
                      <span>{event.startTime} {event.endTime ? `- ${event.endTime}` : ''}</span>
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-text-primary">{event.title}</h4>
                  {event.description && (
                    <p className="mt-1 text-sm text-text-secondary">{event.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
