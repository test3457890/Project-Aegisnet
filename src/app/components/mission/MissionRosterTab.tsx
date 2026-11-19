import React, { useEffect, useState } from 'react';
import { useMissionState, presenceLabel } from '../../state/missionState';
import { useMockAppState } from '../../state/mockAppState';
import { Users, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { MemberProfilePopover } from '../ui/MemberProfilePopover';

interface MissionRosterTabProps {
  missionId: string;
}

export function MissionRosterTab({ missionId }: MissionRosterTabProps) {
  const { missions } = useMissionState();
  const { users, me } = useMockAppState();
  const mission = missions[missionId];
  const [filterDutyOnly, setFilterDutyOnly] = useState(false);

  useEffect(() => {
    import('../../qa/qaEvents').then(({ logQaEvent }) => {
      logQaEvent({ type: 'mission.roster.opened', missionId } as any);
    }).catch(() => {});
  }, [missionId]);

  if (!mission) return null;

  const userName = (id: string) => (id === me.id ? me.name : users[id]?.name || id);

  const rosterMembers = mission.memberIds.map(id => {
    // Find latest duty check-in
    const latestCheckIn = [...mission.dutyCheckIns]
      .filter(chk => chk.userId === id)
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))[0];

    // Find pending tasks assigned to this user
    const pendingTasks = mission.tasks.filter(t => !t.done && t.assigneeId === id).length;

    // Default status if no check in
    const status = latestCheckIn ? latestCheckIn.status : (id === me.id ? 'available' : 'unknown');
    
    // Derived on-duty
    const isOnDuty = latestCheckIn ? latestCheckIn.status === 'on-duty' || latestCheckIn.status === 'in-field' || latestCheckIn.status === 'driving' : false;

    return {
      id,
      name: userName(id),
      status,
      latestCheckInTime: latestCheckIn ? Number(latestCheckIn.timestamp) : null,
      pendingTasks,
      isOnDuty
    };
  });

  const filteredMembers = filterDutyOnly ? rosterMembers.filter(m => m.isOnDuty) : rosterMembers;

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-text-primary">Mission Roster</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterDutyOnly}
            onChange={(e) => setFilterDutyOnly(e.target.checked)}
            className="rounded border-border-default text-accent-primary focus:ring-accent-primary"
          />
          <span className="text-sm text-text-secondary font-bold">On duty only</span>
        </label>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default p-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-hover text-text-muted">
            <Users size={24} />
          </div>
          <h3 className="text-sm font-bold text-text-primary">No members found</h3>
          <p className="mt-1 text-xs text-text-secondary">Adjust filters or add members to the mission.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredMembers.map((member) => (
            <li key={member.id} className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-card p-3">
              <MemberProfilePopover user={users[member.id] || me} side="right">
                <div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-accent-primary transition-all overflow-hidden", users[member.id]?.profilePictureUrl ? "" : (users[member.id]?.avatarColor || "bg-slate-600"))}>
                  {users[member.id]?.profilePictureUrl ? (
                    <img src={users[member.id].profilePictureUrl} alt={member.name} className="h-full w-full object-cover" />
                  ) : (users[member.id]?.initials || (member.id === me.id ? me.initials : "??"))}
                </div>
              </MemberProfilePopover>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <MemberProfilePopover user={users[member.id] || me} side="right">
                    <p className="truncate text-sm font-semibold text-text-primary hover:underline cursor-pointer w-fit">
                      {member.name}{member.id === me.id && " (you)"}
                    </p>
                  </MemberProfilePopover>
                  {member.isOnDuty && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-success/30 bg-success/10 text-success uppercase tracking-wider">
                      On Duty
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={12} className={member.isOnDuty ? "text-success" : "text-text-muted"} />
                    {presenceLabel(member.status as any)}
                  </span>
                  {member.latestCheckInTime && (
                    <span>Last check-in: {new Date(member.latestCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                  {member.pendingTasks > 0 && (
                    <span className="font-bold text-amber-600 bg-amber-600/10 px-1.5 py-0.5 rounded border border-amber-600/20">
                      {member.pendingTasks} pending task{member.pendingTasks !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
