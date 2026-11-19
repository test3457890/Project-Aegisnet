import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useMockAppState } from "../../../state/mockAppState";

export function NetworkSetupChecklist({ networkId }: { networkId: string }) {
  const { networks } = useMockAppState();
  const network = networks[networkId];

  if (!network) return null;

  const hasRooms = network.rooms && network.rooms.some(cat => cat.items.length > 0);
  const hasRoles = network.roles && network.roles.length > 0;
  const hasMembers = network.memberIds && network.memberIds.length > 1;

  const steps = [
    { label: "Create Rooms", completed: hasRooms },
    { label: "Define Roles", completed: hasRoles },
    { label: "Invite Members", completed: hasMembers },
  ];

  return (
    <div className="rounded-xl border border-border-default bg-surface-card p-4 space-y-3">
      <h3 className="text-sm font-bold text-text-primary">Network Setup Checklist</h3>
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            {step.completed ? (
              <CheckCircle2 size={16} className="text-success" />
            ) : (
              <Circle size={16} className="text-text-muted" />
            )}
            <span className={step.completed ? "text-text-secondary line-through" : "text-text-primary"}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
