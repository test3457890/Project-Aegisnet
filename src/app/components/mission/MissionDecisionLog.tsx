import React, { useState } from 'react';
import { useMissionState } from '../../state/missionState';
import { useMockAppState } from '../../state/mockAppState';
import { ShieldCheck, UserRound } from 'lucide-react';
import { logQaEvent } from '../../qa/qaEvents';

export function MissionDecisionLog({ missionId }: { missionId: string }) {
  const { missions, addDecision } = useMissionState();
  const { users, me } = useMockAppState();
  const [decisionDraft, setDecisionDraft] = useState('');

  const mission = missions[missionId];
  if (!mission) return null;

  const userName = (id: string) => (id === me.id ? me.name : users[id]?.name || id);
  const decisions = mission.timeline.filter(t => t.kind === "decision");

  return (
    <section className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (missionId && decisionDraft.trim() && mission.mode !== "archive") {
            addDecision(missionId, decisionDraft);
            setDecisionDraft("");
            logQaEvent({ type: "mission.decision.added", missionId });
          }
        }}
        className="flex gap-2"
      >
        <input
          value={decisionDraft}
          onChange={(event) => setDecisionDraft(event.target.value)}
          placeholder="Record a decision..."
          disabled={mission.mode === "archive"}
          className="flex-1 rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none disabled:opacity-50"
        />
        <button type="submit" disabled={mission.mode === "archive"} className="rounded-xl bg-accent-secondary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          <ShieldCheck size={16} />
        </button>
      </form>
      <div className="space-y-3">
        {decisions.length === 0 ? (
          <div className="text-center py-8 text-text-secondary text-sm">
            No decisions recorded yet.
          </div>
        ) : (
          decisions.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-text-primary">{entry.text}</span>
                <span className="text-xs text-text-muted whitespace-nowrap">
                  {new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {entry.authorId && (
                <div className="mt-2 text-xs text-text-secondary flex items-center gap-1">
                  <UserRound size={12} /> Recorded by {userName(entry.authorId)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
