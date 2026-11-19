import { ShieldCheck, ShieldAlert, CheckCircle, Clock, AlertTriangle, AlertCircle, Bell, FileText } from "lucide-react";
import { useMissionState } from "../../state/missionState";
import { useMockAppState } from "../../state/mockAppState";

export function MissionOpsDashboard({ missionId }: { missionId: string }) {
  const { missions } = useMissionState();
  const { users, me } = useMockAppState();
  const mission = missions[missionId];

  if (!mission) return null;

  const pendingTasks = mission.tasks.filter((t) => !t.done);
  const overdueTasks = pendingTasks.filter((t) => {
    if (!t.dueTime) return false;
    // Basic string comparison for ISO dates or simple time, assumes ISO
    return new Date(t.dueTime) < new Date();
  });

  const activeCheckIns = mission.dutyCheckIns?.filter(c => c.status !== "off-duty" && c.status !== "available") || [];
  const emergencies = mission.dutyCheckIns?.filter(c => c.status === "needs-assistance") || [];

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
        <div className="flex items-start gap-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20 p-4">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-accent-readable" />
          <div>
            <h2 className="text-sm font-bold text-accent-readable">AegisNet Trust Operations</h2>
            <p className="text-accent-readable mt-1">
              AegisNet is an Advanced Prototype / Early Alpha. Mission Operations, File Vault, scheduling, and check-in tools in this build are prototype or planned unless clearly marked backend-backed.
            </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Status Card */}
        <div className="rounded-2xl border border-border-default bg-surface-card p-4">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <CheckCircle size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Mission Status</span>
          </div>
          <div className="text-lg font-bold text-text-primary capitalize">{mission.status}</div>
        </div>

        {/* Tasks Card */}
        <div className={`rounded-2xl border ${overdueTasks.length > 0 ? 'border-danger/30 bg-danger/5' : 'border-border-default bg-surface-card'} p-4`}>
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Clock size={16} className={overdueTasks.length > 0 ? "text-danger-readable" : ""} />
            <span className="text-xs font-bold uppercase tracking-wider">Pending Tasks</span>
          </div>
          <div className="text-lg font-bold text-text-primary">
            {pendingTasks.length} <span className="text-sm font-normal text-text-secondary">({overdueTasks.length} overdue)</span>
          </div>
        </div>

        {/* Check-ins Card */}
        <div className="rounded-2xl border border-border-default bg-surface-card p-4">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <AlertTriangle size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Active Duty</span>
          </div>
          <div className="text-lg font-bold text-text-primary">
            {activeCheckIns.length}
          </div>
        </div>

        {/* Emergencies Card */}
        <div className={`rounded-2xl border ${emergencies.length > 0 ? 'border-danger/50 bg-danger/10' : 'border-border-default bg-surface-card'} p-4`}>
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <AlertCircle size={16} className={emergencies.length > 0 ? "text-danger-readable" : ""} />
            <span className="text-xs font-bold uppercase tracking-wider">Assistance</span>
          </div>
          <div className={`text-lg font-bold ${emergencies.length > 0 ? 'text-danger-readable' : 'text-text-primary'}`}>
            {emergencies.length}
          </div>
        </div>
      </div>

      {/* Prototype Alerts */}
      <div className="space-y-2 mt-6">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-3">
          <Bell size={16} /> Mission Notices (Prototype Alerts)
        </h3>
        
        {overdueTasks.length > 0 && (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 flex items-center gap-3">
            <Clock size={16} className="text-danger-readable" />
            <span className="text-sm text-text-primary">You have {overdueTasks.length} overdue tasks.</span>
          </div>
        )}

        {/* Since briefing isn't fully defined yet we use optional chaining safely */}
        {!(mission as any).briefing?.leadId && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="text-sm text-text-primary">Missing Mission Lead assignment.</span>
          </div>
        )}

        {!(mission as any).briefing?.safetyOfficerId && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="text-sm text-text-primary">Missing Safety Officer assignment.</span>
          </div>
        )}

        {mission.status === "completed" && !mission.aarDraft && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
            <FileText size={16} className="text-amber-500" />
            <span className="text-sm text-text-primary">AAR not completed.</span>
          </div>
        )}
      </div>
    </div>
  );
}
