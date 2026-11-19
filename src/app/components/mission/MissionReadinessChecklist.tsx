import React from 'react';
import { useMissionState, MissionReadiness } from '../../state/missionState';
import { AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { clsx } from 'clsx';

interface MissionReadinessChecklistProps {
  missionId: string;
}

export function MissionReadinessChecklist({ missionId }: MissionReadinessChecklistProps) {
  const { missions, updateReadiness } = useMissionState();
  const mission = missions[missionId];

  if (!mission) return null;

  const readiness = mission.readiness || {
    briefingAdded: false,
    timeZoneSelected: false,
    rolesAssigned: false,
    filesAdded: false,
    tasksCreated: false,
    voiceSettingsChecked: false,
    permissionsChecked: false,
    safetyNotesAdded: false,
    checkInEnabled: false,
    aarEnabled: false,
  };

  const toggleItem = (key: string) => {
    updateReadiness(missionId, { [key]: !(readiness as any)[key] });
  };

  const checklistItems: { key: string, label: string, desc: string }[] = [
    { key: 'briefingAdded', label: 'Briefing added', desc: 'Main goal defined in briefing' },
    { key: 'timeZoneSelected', label: 'Mission time zone selected', desc: 'Local or operation time zone configured' },
    { key: 'rolesAssigned', label: 'Roles assigned', desc: 'Lead and other roles assigned' },
    { key: 'filesAdded', label: 'Files added if needed', desc: 'Required documents uploaded and checked' },
    { key: 'tasksCreated', label: 'Tasks added', desc: 'Initial action items populated' },
    { key: 'voiceSettingsChecked', label: 'Voice settings checked', desc: 'Voice comms channels verified' },
    { key: 'permissionsChecked', label: 'Permissions checked', desc: 'Access limits confirmed' },
    { key: 'safetyNotesAdded', label: 'Safety notes added if needed', desc: 'Hazards and safety protocols documented' },
    { key: 'checkInEnabled', label: 'Check-in enabled', desc: 'Duty status monitoring active' },
    { key: 'aarEnabled', label: 'AAR enabled', desc: 'After action report protocol enabled' },
  ];

  const total = checklistItems.length;
  const completed = checklistItems.filter(item => (readiness as any)[item.key]).length;
  const progressPercent = Math.round((completed / total) * 100);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
        <AlertTriangle size={16} className="text-yellow-500" />
        <span className="text-sm font-bold text-yellow-500">
          Readiness Warning: Prototype guidance only. Does not imply real operational authority.
        </span>
      </div>

      <div className="bg-background-secondary rounded-xl p-4 border border-border-default">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Mission Readiness Check</h3>
          <span className="text-sm font-bold text-accent-primary">{completed} / {total} ({progressPercent}%)</span>
        </div>
        
        <div className="w-full bg-background-tertiary rounded-full h-2.5 mb-6">
          <div className="bg-accent-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {checklistItems.map((item) => {
            const isChecked = (readiness as any)[item.key];
            return (
              <div 
                key={item.key}
                onClick={() => toggleItem(item.key)}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-background-tertiary cursor-pointer transition-colors"
              >
                <div className="mt-0.5 text-accent-primary flex-shrink-0">
                  {isChecked ? <CheckSquare size={18} /> : <Square size={18} className="text-text-secondary" />}
                </div>
                <div>
                  <p className={clsx("text-sm font-bold transition-colors", isChecked ? "text-text-primary" : "text-text-secondary")}>
                    {item.label}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
