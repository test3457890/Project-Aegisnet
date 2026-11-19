import React, { useState } from 'react';
import { useMissionState, MissionAsset } from '../../state/missionState';
import { useMockAppState } from '../../state/mockAppState';
import { ShieldCheck, Plus } from 'lucide-react';
import { clsx } from 'clsx';

interface MissionAssetTrackerProps {
  missionId: string;
}

export function MissionAssetTracker({ missionId }: MissionAssetTrackerProps) {
  const { missions, addAsset, updateAsset } = useMissionState();
  const { users, me } = useMockAppState();
  const mission = missions[missionId];

  const [isAdding, setIsAdding] = useState(false);
  const [newAsset, setNewAsset] = useState<Omit<MissionAsset, "id">>({
    name: '',
    type: 'Radio',
    assigneeId: '',
    condition: 'good',
    status: 'available',
    notes: ''
  });

  if (!mission) return null;

  const allMembers = mission.memberIds.map(id => users[id] || (id === me.id ? me : null)).filter(Boolean);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name.trim()) return;
    
    addAsset(missionId, { ...newAsset });
    setNewAsset({
      name: '',
      type: 'Radio',
      assigneeId: '',
      condition: 'good',
      status: 'available',
      notes: ''
    });
    setIsAdding(false);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-center gap-2 bg-accent-primary/10 border border-accent-primary/20 rounded-xl px-4 py-3">
        <ShieldCheck size={16} className="text-accent-readable" />
        <span className="text-sm font-bold text-accent-readable">
          Asset Tracker is a prototype mission equipment tracking tool. It is not official inventory control, evidence tracking, chain of custody, GPS tracking, or legal record keeping.
        </span>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Mission Assets</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover transition-colors"
        >
          <Plus size={16} /> Add Asset
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-background-secondary p-4 rounded-xl border border-border-default space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Asset Name</label>
              <input
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                placeholder="e.g. Radio Alpha"
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Type</label>
              <select
                value={newAsset.type}
                onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value as any })}
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              >
                {['Radio', 'Medical kit', 'Vehicle', 'Laptop', 'Camera', 'Field pack', 'Event kit', 'Custom'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Assignee</label>
              <select
                value={newAsset.assigneeId}
                onChange={(e) => setNewAsset({ ...newAsset, assigneeId: e.target.value })}
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              >
                <option value="">Unassigned</option>
                {allMembers.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Condition</label>
              <input
                value={newAsset.condition}
                onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}
                placeholder="Good, fair, poor..."
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Status</label>
              <select
                value={newAsset.status}
                onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value as any })}
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              >
                <option value="available">Available</option>
                <option value="checked-out">Checked Out</option>
                <option value="maintenance">Maintenance</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Notes</label>
              <input
                value={newAsset.notes}
                onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                placeholder="Optional notes"
                className="w-full rounded-xl border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              />
            </div>
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
              Save Asset
            </button>
          </div>
        </form>
      )}

      {(!mission.assets || mission.assets.length === 0) ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          No assets tracked for this mission yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-background-secondary text-text-secondary">
              <tr>
                <th className="px-4 py-3 rounded-tl-xl">Asset</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3 rounded-tr-xl">Condition</th>
              </tr>
            </thead>
            <tbody>
              {mission.assets.map(asset => {
                const assigneeName = asset.assigneeId ? (users[asset.assigneeId]?.name || (asset.assigneeId === me.id ? me.name : 'Unknown')) : 'Unassigned';
                return (
                  <tr key={asset.id} className="border-b border-border-default last:border-0">
                    <td className="px-4 py-3 font-medium text-text-primary">{asset.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{asset.type}</td>
                    <td className="px-4 py-3">
                      <select
                        value={asset.status}
                        onChange={(e) => updateAsset(missionId, asset.id, { status: e.target.value as any })}
                        className={clsx(
                          "bg-transparent border-0 text-sm font-medium focus:ring-0 p-0 cursor-pointer",
                          asset.status === 'available' ? 'text-green-500' :
                          asset.status === 'checked-out' ? 'text-blue-500' :
                          asset.status === 'maintenance' ? 'text-orange-500' :
                          'text-red-500'
                        )}
                      >
                        <option className="text-text-primary" value="available">Available</option>
                        <option className="text-text-primary" value="checked-out">Checked Out</option>
                        <option className="text-text-primary" value="maintenance">Maintenance</option>
                        <option className="text-text-primary" value="lost">Lost</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <select
                        value={asset.assigneeId || ''}
                        onChange={(e) => updateAsset(missionId, asset.id, { assigneeId: e.target.value })}
                        className="bg-transparent border-0 text-sm focus:ring-0 p-0 cursor-pointer text-text-secondary"
                      >
                        <option value="">Unassigned</option>
                        {allMembers.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{asset.condition}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
