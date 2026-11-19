import React from "react";
import { useMockAppState } from "../../state/mockAppState";

export function OrganizationTreeScreen({ networkId }: { networkId: string }) {
  const { networks, users } = useMockAppState();
  const network = networks[networkId];
  
  if (!network) return null;
  const orgNodes = network.orgNodes || [];

  const warningLabel = "Organization Tree and Chain of Command labels help Networks display internal structure. They do not verify official rank, employment status, legal authority, clearance, identity, or external organization records.";

  const renderNode = (nodeId: string) => {
    const node = orgNodes.find(n => n.id === nodeId);
    if (!node) return null;
    const children = orgNodes.filter(n => n.parentId === nodeId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const assignedUser = node.assignedMemberId ? users[node.assignedMemberId] : null;

    return (
      <div key={node.id} className="ml-6 border-l-2 border-border-default pl-4 relative my-2">
        <div className="absolute w-4 h-2 border-b-2 border-border-default -left-0.5 top-3"></div>
        <div className="p-3 border rounded-xl bg-surface-card border-border-default">
          <div className="font-bold">{node.name} <span className="text-xs font-normal opacity-70">({node.type})</span></div>
          {node.isVacant ? (
            <div className="text-sm text-danger italic mt-1">Vacant</div>
          ) : (
            assignedUser && (
              <div className="text-sm text-text-secondary mt-1 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-primary inline-block"></span>
                {assignedUser.displayName}
                {node.isActing && <span className="text-xs bg-surface-hover px-1 rounded ml-1">Acting</span>}
              </div>
            )
          )}
        </div>
        <div className="mt-2">
          {children.map(c => renderNode(c.id))}
        </div>
      </div>
    );
  };

  const rootNodes = orgNodes.filter(n => !n.parentId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="flex flex-col w-full h-full p-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold">Organization Tree</h1>
        <span className="px-2 py-1 text-xs font-bold text-white bg-indigo-600 rounded">Local Prototype</span>
      </div>

      <div className="p-3 mb-6 text-sm border rounded bg-surface-hover border-border-default text-text-secondary">
        <strong>Local Prototype Warning:</strong> {warningLabel}
      </div>

      <div className="flex flex-col">
        {rootNodes.length === 0 && <p className="text-text-secondary">No organization nodes created.</p>}
        {rootNodes.map(node => renderNode(node.id))}
      </div>
    </div>
  );
}
