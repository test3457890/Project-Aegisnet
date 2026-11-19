import { MapPin, Target, ShieldCheck, FileText, AlertTriangle } from "lucide-react";
import { useMissionState } from "../../state/missionState";
import { useMockAppState } from "../../state/mockAppState";

interface MissionBriefingCardProps {
  missionId: string;
}

export function MissionBriefingCard({ missionId }: MissionBriefingCardProps) {
  const { missions } = useMissionState();
  const { users } = useMockAppState();
  const mission = missions[missionId];

  if (!mission) return null;
  const b = mission.briefing || {};

  const userName = (id?: string) => id ? (users[id]?.name || id) : "Unassigned";

  return (
    <div className="rounded-xl border border-border-default bg-surface-card p-4 space-y-4">
      <div className="flex items-center gap-2 border-b border-border-default pb-2">
        <FileText size={18} className="text-accent-readable" />
        <h2 className="text-sm font-bold text-text-primary">Mission Briefing Summary</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-3">
          <div>
            <span className="text-text-muted text-xs font-semibold block">Objective</span>
            <span className="text-text-primary font-medium">{mission.objective || b.objective || "Not specified"}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs font-semibold block">Situation / Purpose</span>
            <span className="text-text-primary">{b.situation || "Not specified"}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs font-semibold block">Location / Area</span>
            <span className="text-text-primary flex items-center gap-1">
              <MapPin size={14} className="text-text-secondary" />
              {b.area || "Not specified"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-text-muted text-xs font-semibold block">Leadership</span>
            <ul className="text-text-primary space-y-1 mt-1">
              <li className="flex items-center gap-2"><Target size={14} className="text-accent-primary" /> Lead: {userName(b.leadId)}</li>
              <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-success" /> Safety: {userName(b.safetyOfficerId)}</li>
            </ul>
          </div>
          
          {b.risks && (
            <div className="bg-danger/10 border border-danger/20 rounded p-2 text-danger-readable text-xs">
              <span className="font-bold flex items-center gap-1 mb-1"><AlertTriangle size={12} /> Key Risks</span>
              {b.risks}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
