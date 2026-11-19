import React, { useEffect } from 'react';
import { useMissionState } from '../../state/missionState';
import { useMockAppState } from '../../state/mockAppState';
import { Activity, Bell, FileText, CheckSquare, ListTodo, ShieldCheck, ArrowRightLeft, Settings } from 'lucide-react';

export function MissionCatchUpPanel({ missionId }: { missionId: string }) {
  const { missions, setLastSeenTimeline } = useMissionState();
  const { me } = useMockAppState();
  
  const mission = missions[missionId];
  if (!mission) return null;

  const lastSeen = mission.lastSeenTimelineAt?.[me.id] || 0;

  // Mark as seen when opening this panel
  useEffect(() => {
    setLastSeenTimeline(missionId);
  }, [missionId, setLastSeenTimeline]);

  const newEvents = mission.timeline.filter(t => t.at > lastSeen);
  const decisions = newEvents.filter(t => t.kind === 'decision').length;
  const alerts = newEvents.filter(t => t.kind === 'alert').length;
  
  // Mode changes are system events with specific text
  const modeChanges = newEvents.filter(t => t.kind === 'system' && t.text.includes('mode')).length;

  const completedTasks = mission.tasks.filter(t => t.done && t.completedAt && parseInt(t.completedAt) > lastSeen).length;
  
  // We don't have creation timestamps for tasks or files, so we might not be able to compute "new" accurately 
  // without guessing or tracking. We'll show 0 or compute if possible.
  // Actually, assets have updatedAt
  const newFiles = mission.assets?.filter(a => a.type === 'Document' && new Date(a.updatedAt).getTime() > lastSeen).length || 0;
  
  const newHandoffs = mission.handoffs?.filter(h => new Date(h.time).getTime() > lastSeen).length || 0;

  const items = [
    { label: 'New files', count: newFiles, icon: FileText },
    { label: 'New tasks', count: 0, icon: ListTodo }, // Can't track without createdAt
    { label: 'Completed tasks', count: completedTasks, icon: CheckSquare },
    { label: 'Decisions', count: decisions, icon: ShieldCheck },
    { label: 'Alerts', count: alerts, icon: Bell },
    { label: 'Handoffs', count: newHandoffs, icon: ArrowRightLeft },
    { label: 'Mode changes', count: modeChanges, icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-accent-primary/10 border border-accent-primary/20 rounded-xl px-4 py-3">
        <Activity size={16} className="text-accent-readable" />
        <span className="text-sm font-bold text-accent-readable">
          Catch Up Summary (Since last viewed)
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => (
          <div key={item.label} className="bg-background-secondary p-4 rounded-xl border border-border-default flex flex-col items-center justify-center text-center">
            <item.icon size={24} className="text-accent-primary mb-2" />
            <span className="text-2xl font-bold text-text-primary">{item.count}</span>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">{item.label}</span>
          </div>
        ))}
      </div>
      
      {newEvents.length > 0 && (
         <div className="bg-background-secondary p-4 rounded-xl border border-border-default mt-6">
           <h3 className="text-sm font-bold text-text-primary mb-3">Recent Timeline</h3>
           <ol className="space-y-2">
             {newEvents.slice(0, 5).map(e => (
               <li key={e.id} className="text-sm text-text-secondary">
                 <span className="font-bold text-text-primary mr-2">{new Date(e.at).toLocaleTimeString()}:</span>
                 {e.text}
               </li>
             ))}
           </ol>
         </div>
      )}
    </div>
  );
}
