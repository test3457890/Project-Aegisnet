import React, { useState } from "react";
import { useMockAppState } from "../../state/mockAppState";
import { Plus, Edit2, Trash2, UserPlus, X, ShieldAlert } from "lucide-react";

export function OrganizationTreeAdminEditor({ networkId }: { networkId: string }) {
  const { networks, createOrgNode, updateOrgNode, deleteOrgNode, assignMemberToOrgNode, currentUser } = useMockAppState();
  const network = networks[networkId];
  
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeType, setNewNodeType] = useState<any>("duty_position");
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);

  // Guard: Prototype Warning
  const warningLabel = "Organization Tree and Chain of Command labels help Networks display internal structure. They do not verify official rank, employment status, legal authority, clearance, identity, or external organization records.";

  if (!network) return null;

  // Enforce Admin only view
  const myRoles = network.memberRoles?.[currentUser.id] || [];
  const isAdmin = myRoles.some(rId => {
    const roleDef = network.roles?.find(r => r.id === rId);
    return roleDef?.permissions.includes("manage_rooms") || roleDef?.permissions.includes("manage_members");
  }) || network.ownerId === currentUser.id;

  if (!isAdmin) {
    return (
      <div className="p-4 border rounded-xl bg-surface-card border-border-default text-text-primary">
        <ShieldAlert className="mb-2 text-danger" size={24} />
        <h3 className="font-bold">Access Denied</h3>
        <p className="text-sm text-text-secondary">Local Prototype: Only authorized Network Admins can edit the Organization Tree.</p>
      </div>
    );
  }

  const handleCreate = () => {
    if (!newNodeName.trim()) return;
    createOrgNode(networkId, {
      name: newNodeName,
      type: newNodeType,
      parentId: selectedParentId
    });
    setNewNodeName("");
  };

  const orgNodes = network.orgNodes || [];

  const handleAssignMember = (nodeId: string, memberId: string | undefined, isActing: boolean) => {
    if (memberId && !isActing) {
      const alreadyAssigned = orgNodes.some(n => n.assignedMemberId === memberId && !n.isActing && n.id !== nodeId);
      if (alreadyAssigned) {
        alert("Member is already assigned to another node. Mark as acting/additional duty if required.");
        return;
      }
    }
    updateOrgNode(networkId, nodeId, { assignedMemberId: memberId, isActing, isVacant: !memberId });
  };

  const handleUpdateNode = (nodeId: string, updates: Partial<any>) => {
    updateOrgNode(networkId, nodeId, updates);
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-text-primary">
      <div className="p-3 text-sm border rounded bg-surface-hover border-border-default text-text-secondary">
        <strong>Local Prototype Warning:</strong> {warningLabel}
      </div>

      <div className="flex flex-col gap-2 p-4 border rounded-xl bg-surface-card border-border-default">
        <h3 className="font-bold text-md">Add Node</h3>
        <input 
          value={newNodeName} 
          onChange={e => setNewNodeName(e.target.value)} 
          placeholder="Node Name (e.g. Commander, Team Alpha)"
          className="p-2 border rounded bg-background-primary border-border-default focus:border-primary focus:outline-none"
        />
        <select 
          value={newNodeType} 
          onChange={e => setNewNodeType(e.target.value as any)}
          className="p-2 border rounded bg-background-primary border-border-default"
        >
          <option value="network_command">Network Command</option>
          <option value="department">Department</option>
          <option value="team">Team</option>
          <option value="flight">Flight</option>
          <option value="group">Group</option>
          <option value="staff_section">Staff Section</option>
          <option value="duty_position">Duty Position</option>
          <option value="mission_position">Mission Position</option>
        </select>
        <select 
          value={selectedParentId || ""} 
          onChange={e => setSelectedParentId(e.target.value || undefined)}
          className="p-2 border rounded bg-background-primary border-border-default"
        >
          <option value="">-- No Parent (Root Node) --</option>
          {orgNodes.map(n => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
        <button 
          onClick={handleCreate} 
          className="flex items-center justify-center gap-2 px-4 py-2 mt-2 font-bold text-white rounded bg-primary hover:bg-primary/90"
        >
          <Plus size={16} /> Create Node
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-bold text-md">Existing Nodes</h3>
        {orgNodes.length === 0 && <p className="text-sm text-text-secondary">No organization nodes created yet.</p>}
        {orgNodes.map(node => (
          <div key={node.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-surface-card border-border-default">
            <div className="flex items-center justify-between">
              <input
                value={node.name}
                onChange={e => handleUpdateNode(node.id, { name: e.target.value })}
                className="font-bold p-1 border rounded bg-background-primary border-border-default"
              />
              <span className="ml-2 text-xs font-normal opacity-70">({node.type})</span>
              <button onClick={() => deleteOrgNode(networkId, node.id)} className="p-1 rounded text-danger hover:bg-danger/10">
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="flex gap-2">
              <select 
                value={node.parentId || ""} 
                onChange={e => handleUpdateNode(node.id, { parentId: e.target.value || undefined })}
                className="text-xs p-1 border rounded bg-background-primary border-border-default"
              >
                <option value="">-- No Parent --</option>
                {orgNodes.filter(n => n.id !== node.id).map(n => (
                  <option key={n.id} value={n.id}>Reports to: {n.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 mt-2 text-sm border-t border-border-default pt-2">
              <UserPlus size={14} />
              <select
                value={node.assignedMemberId || ""}
                onChange={e => handleAssignMember(node.id, e.target.value || undefined, node.isActing || false)}
                className="p-1 border rounded bg-background-primary border-border-default flex-1"
              >
                <option value="">-- Vacant --</option>
                {(network.memberIds || []).map(mId => (
                  <option key={mId} value={mId}>{mId}</option>
                ))}
              </select>
              
              <label className="flex items-center gap-1 text-xs">
                <input 
                  type="checkbox" 
                  checked={node.isActing || false}
                  onChange={e => handleAssignMember(node.id, node.assignedMemberId, e.target.checked)}
                />
                Acting
              </label>

              <label className="flex items-center gap-1 text-xs">
                <input 
                  type="checkbox" 
                  checked={node.isVacant || false}
                  onChange={e => handleUpdateNode(node.id, { isVacant: e.target.checked })}
                />
                Vacant
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
