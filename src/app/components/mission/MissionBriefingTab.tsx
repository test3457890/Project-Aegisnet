import React, { useState, useEffect } from 'react';
import { useMissionState } from '../../state/missionState';
import { useMockAppState } from '../../state/mockAppState';
import { ShieldCheck, Target } from 'lucide-react';
import { clsx } from 'clsx';

interface MissionBriefingTabProps {
  missionId: string;
}

export function MissionBriefingTab({ missionId }: MissionBriefingTabProps) {
  const { missions, updateBriefing } = useMissionState();
  const { users, me } = useMockAppState();
  const mission = missions[missionId];

  // Local state for edits
  const [objective, setObjective] = useState('');
  const [situation, setSituation] = useState('');
  const [area, setArea] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [missionLeadId, setMissionLeadId] = useState('');
  const [safetyOfficerId, setSafetyOfficerId] = useState('');
  const [commsLeadId, setCommsLeadId] = useState('');
  const [keyRisks, setKeyRisks] = useState('');
  const [notes, setNotes] = useState('');

  // Sync state when mission changes
  useEffect(() => {
    if (mission) {
      setObjective(mission.objective || '');
      setSituation(mission.briefing?.situation || '');
      setArea(mission.briefing?.area || '');
      setStartTime(mission.briefing?.startTime || '');
      setEndTime(mission.briefing?.endTime || '');
      setMissionLeadId(mission.briefing?.missionLeadId || '');
      setSafetyOfficerId(mission.briefing?.safetyOfficerId || '');
      setCommsLeadId(mission.briefing?.commsLeadId || '');
      setKeyRisks(mission.briefing?.keyRisks || '');
      setNotes(mission.briefing?.notes || '');
    }
  }, [mission]);

  if (!mission) return null;

  const handleSave = () => {
    updateBriefing(
      missionId,
      {
        situation,
        area,
        startTime,
        endTime,
        missionLeadId,
        safetyOfficerId,
        commsLeadId,
        keyRisks,
        notes,
      },
      objective
    );
  };

  const handleBlur = () => {
    handleSave();
  };

  const allMembers = mission.memberIds.map(id => users[id] || (id === me.id ? me : null)).filter(Boolean);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-center gap-2 bg-accent-primary/10 border border-accent-primary/20 rounded-xl px-4 py-3">
        <ShieldCheck size={16} className="text-accent-readable" />
        <span className="text-sm font-bold text-accent-readable">
          Local-only prototype. No real dispatch, GPS tracking, or official emergency claims are supported.
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Objective</label>
          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            onBlur={handleBlur}
            placeholder="Main mission objective"
            className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Situation</label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            onBlur={handleBlur}
            placeholder="Current situation and context"
            rows={3}
            className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Area (Text Only)</label>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            onBlur={handleBlur}
            placeholder="Operational area description"
            className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={handleBlur}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Expected End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onBlur={handleBlur}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="missionLead" className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Mission Lead</label>
            <select
              id="missionLead"
              value={missionLeadId}
              onChange={(e) => { setMissionLeadId(e.target.value); updateBriefing(missionId, { missionLeadId: e.target.value }); }}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="">Unassigned</option>
              {allMembers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="safetyOfficer" className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Safety Officer</label>
            <select
              id="safetyOfficer"
              value={safetyOfficerId}
              onChange={(e) => { setSafetyOfficerId(e.target.value); updateBriefing(missionId, { safetyOfficerId: e.target.value }); }}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="">Unassigned</option>
              {allMembers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="commsLead" className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Communications Lead</label>
            <select
              id="commsLead"
              value={commsLeadId}
              onChange={(e) => { setCommsLeadId(e.target.value); updateBriefing(missionId, { commsLeadId: e.target.value }); }}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="">Unassigned</option>
              {allMembers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Key Risks</label>
          <textarea
            value={keyRisks}
            onChange={(e) => setKeyRisks(e.target.value)}
            onBlur={handleBlur}
            placeholder="Environmental hazards, constraints, etc."
            rows={2}
            className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleBlur}
            placeholder="Additional information"
            rows={3}
            className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
          />
        </div>
      </div>
    </section>
  );
}
