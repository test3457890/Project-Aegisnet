import React, { useState } from 'react';
import { useMissionState, PresenceStatus } from '../../state/missionState';
import { AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';

interface DutyStatusPanelProps {
  missionId: string;
}

export function DutyStatusPanel({ missionId }: DutyStatusPanelProps) {
  const { recordDutyCheckIn } = useMissionState();
  const [status, setStatus] = useState<PresenceStatus>("available");
  const [note, setNote] = useState("");

  const handleCheckIn = () => {
    recordDutyCheckIn(missionId, status, note);
    setNote("");
  };

  const handleCheckOut = () => {
    recordDutyCheckIn(missionId, "off-duty", note);
    setStatus("off-duty");
    setNote("");
  };

  return (
    <div className="rounded-2xl border border-border-default bg-surface-card p-4 space-y-4">
      <h3 className="font-bold text-lg text-text-primary">Duty Status Panel</h3>
      
      <div className="flex flex-wrap gap-4 items-center">
        <select 
          aria-label="Duty status"
          value={status} 
          onChange={e => setStatus(e.target.value as PresenceStatus)} 
          className="rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="available">Available</option>
          <option value="on-duty">On duty</option>
          <option value="in-briefing">In briefing</option>
          <option value="in-field">In field</option>
          <option value="on-break">On break</option>
          <option value="off-duty">Off duty</option>
          <option value="needs-assistance">Needs assistance</option>
        </select>
        
        <input 
          type="text" 
          placeholder="Optional note..." 
          value={note} 
          onChange={e => setNote(e.target.value)} 
          className="flex-1 rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none" 
        />
        
        <div className="flex gap-2">
          <button 
            onClick={handleCheckIn} 
            className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover"
          >
            Check-In
          </button>
          <button 
            onClick={handleCheckOut} 
            className="rounded-xl border border-border-default bg-background-secondary px-4 py-2 text-sm font-bold text-text-primary hover:bg-surface-hover"
          >
            Check-Out
          </button>
        </div>
      </div>
      
      {status === "needs-assistance" && (
        <div className="flex items-start gap-2 bg-danger/10 border-l-4 border-danger p-3 rounded-r text-sm text-danger-readable mt-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p className="font-bold">Warning: This is prototype-only and does not imply real emergency dispatch or GPS tracking.</p>
        </div>
      )}

      <div className="flex items-start gap-2 mt-4 text-[11px] text-text-secondary bg-surface-hover p-3 rounded-lg border border-border-default">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>Mission Check-In/Check-Out is a prototype operational status tool. It is not payroll, HR timekeeping, official attendance, emergency dispatch, or legal record keeping.</p>
      </div>
    </div>
  );
}
