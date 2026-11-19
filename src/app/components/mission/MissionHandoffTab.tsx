import React, { useState } from 'react';
import { useMissionState, MissionHandoff } from '../../state/missionState';
import { useMockAppState } from '../../state/mockAppState';
import { ShieldCheck, Plus, FileText } from 'lucide-react';

interface MissionHandoffTabProps {
  missionId: string;
}

export function MissionHandoffTab({ missionId }: MissionHandoffTabProps) {
  const { missions, addHandoff } = useMissionState();
  const { users, me } = useMockAppState();
  const mission = missions[missionId];

  const [isAdding, setIsAdding] = useState(false);
  const [newHandoff, setNewHandoff] = useState<Omit<MissionHandoff, "id"> & { completed?: boolean }>({
    outgoingUserId: me.id,
    incomingUserId: '',
    time: new Date().toISOString().slice(0, 16),
    summary: '',
    openTasks: '',
    risks: '',
    filesToReview: '',
    decisionsMade: '',
    nextActions: '',
    completed: false
  });

  if (!mission) return null;

  const allMembers = mission.memberIds.map(id => users[id] || (id === me.id ? me : null)).filter(Boolean);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandoff.outgoingUserId || !newHandoff.incomingUserId) return;
    
    // Permission check: only outgoing lead or admins should finalize. 
    // In this prototype, we'll assume the active user (me.id) must be the outgoing lead to finalize it, 
    // or they must have permission. We can just check if they are the outgoing lead.
    if (newHandoff.completed && newHandoff.outgoingUserId !== me.id) {
      alert("Only the current lead can finalize this handoff.");
      return;
    }

    addHandoff(missionId, { ...newHandoff });
    
    if (newHandoff.completed) {
      // Log the event
      import('../../qa/qaEvents').then(({ logQaEvent }) => {
        logQaEvent({ type: 'mission.handoff_finalized', missionId });
      });
    }

    setNewHandoff({
      outgoingUserId: me.id,
      incomingUserId: '',
      time: new Date().toISOString().slice(0, 16),
      summary: '',
      openTasks: '',
      risks: '',
      filesToReview: '',
      decisionsMade: '',
      nextActions: '',
      completed: false
    });
    setIsAdding(false);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-center gap-2 bg-accent-primary/10 border border-accent-primary/20 rounded-xl px-4 py-3">
        <ShieldCheck size={16} className="text-accent-readable" />
        <span className="text-sm font-bold text-accent-readable">
          Shift Handoff is a prototype operational note tool. It is not an official incident report, legal record, HR record, or agency handoff system.
        </span>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Shift Handoffs</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover transition-colors"
        >
          <Plus size={16} /> New Handoff
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-background-secondary p-4 rounded-xl border border-border-default space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Current Lead</label>
              <select
                value={newHandoff.outgoingUserId}
                onChange={(e) => setNewHandoff({ ...newHandoff, outgoingUserId: e.target.value })}
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                required
              >
                <option value="">Select...</option>
                {allMembers.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Incoming Lead</label>
              <select
                value={newHandoff.incomingUserId}
                onChange={(e) => setNewHandoff({ ...newHandoff, incomingUserId: e.target.value })}
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                required
              >
                <option value="">Select...</option>
                {allMembers.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Time</label>
              <input
                type="datetime-local"
                value={newHandoff.time}
                onChange={(e) => setNewHandoff({ ...newHandoff, time: e.target.value })}
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Current Status</label>
            <textarea
              value={newHandoff.summary}
              onChange={(e) => setNewHandoff({ ...newHandoff, summary: e.target.value })}
              className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Open Tasks</label>
              <textarea
                value={newHandoff.openTasks}
                onChange={(e) => setNewHandoff({ ...newHandoff, openTasks: e.target.value })}
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Risks & Issues</label>
              <textarea
                value={newHandoff.risks}
                onChange={(e) => setNewHandoff({ ...newHandoff, risks: e.target.value })}
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Files to Review</label>
              <textarea
                value={newHandoff.filesToReview}
                onChange={(e) => setNewHandoff({ ...newHandoff, filesToReview: e.target.value })}
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Last Decision</label>
              <textarea
                value={newHandoff.decisionsMade}
                onChange={(e) => setNewHandoff({ ...newHandoff, decisionsMade: e.target.value })}
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
                rows={2}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Next Action</label>
            <textarea
              value={newHandoff.nextActions}
              onChange={(e) => setNewHandoff({ ...newHandoff, nextActions: e.target.value })}
              className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="handoffCompleted"
              checked={newHandoff.completed}
              onChange={(e) => setNewHandoff({ ...newHandoff, completed: e.target.checked })}
              className="w-4 h-4 text-accent-primary bg-background-primary border-border-default rounded focus:ring-accent-primary"
            />
            <label htmlFor="handoffCompleted" className="text-sm font-bold text-text-primary">
              Handoff Completed
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-text-secondary hover:bg-background-tertiary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-accent-primary text-sm font-bold text-white hover:bg-accent-hover transition-colors"
            >
              Submit Handoff
            </button>
          </div>
        </form>
      )}

      {(!mission.handoffs || mission.handoffs.length === 0) ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          No handoffs recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {mission.handoffs.slice().reverse().map(handoff => {
            const outUser = users[handoff.outgoingUserId]?.name || (handoff.outgoingUserId === me.id ? me.name : 'Unknown');
            const inUser = users[handoff.incomingUserId]?.name || (handoff.incomingUserId === me.id ? me.name : 'Unknown');
            const date = new Date(handoff.time).toLocaleString();
            
            return (
              <div key={handoff.id} className="bg-background-secondary rounded-xl p-4 border border-border-default">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="text-accent-primary" size={20} />
                  <h4 className="font-bold text-text-primary">{outUser} → {inUser}</h4>
                  <span className="text-xs text-text-secondary ml-auto">{date}</span>
                </div>
                
                {handoff.summary && (
                  <div className="mb-2 text-sm">
                    <span className="font-bold text-text-primary">Current Status: </span>
                    <span className="text-text-secondary">{handoff.summary}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {handoff.openTasks && (
                    <div className="text-sm">
                      <span className="font-bold text-text-primary block mb-1">Open Tasks</span>
                      <p className="text-text-secondary whitespace-pre-wrap">{handoff.openTasks}</p>
                    </div>
                  )}
                  {handoff.risks && (
                    <div className="text-sm">
                      <span className="font-bold text-text-primary block mb-1">Risks & Issues</span>
                      <p className="text-text-secondary whitespace-pre-wrap">{handoff.risks}</p>
                    </div>
                  )}
                  {handoff.decisionsMade && (
                    <div className="text-sm">
                      <span className="font-bold text-text-primary block mb-1">Last Decision</span>
                      <p className="text-text-secondary whitespace-pre-wrap">{handoff.decisionsMade}</p>
                    </div>
                  )}
                  {handoff.nextActions && (
                    <div className="text-sm">
                      <span className="font-bold text-text-primary block mb-1">Next Action</span>
                      <p className="text-text-secondary whitespace-pre-wrap">{handoff.nextActions}</p>
                    </div>
                  )}
                  {/* @ts-ignore */}
                  {handoff.completed && (
                    <div className="col-span-full mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-success/10 text-success text-xs font-bold">
                        <ShieldCheck size={12} /> Handoff Completed
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
