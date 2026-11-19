import React, { useState, useMemo } from 'react';
import { useMockAppState } from '../state/mockAppState';
import { X, ChevronRight, HelpCircle, Shield, GraduationCap, Settings, User } from 'lucide-react';
import { MockOrgTreeNode } from '../data/mockNetworks';

interface ChainOfCommandHelperProps {
  networkId: string;
  onClose: () => void;
}

export function ChainOfCommandHelper({ networkId, onClose }: ChainOfCommandHelperProps) {
  const { networks, users, me } = useMockAppState();
  const network = networks[networkId];
  const orgNodes = network?.orgNodes || [];

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const myNode = useMemo(() => orgNodes.find(n => n.assignedMemberId === me.id), [orgNodes, me.id]);

  const chain = useMemo(() => {
    const list: MockOrgTreeNode[] = [];
    let current = myNode;
    // Trace up the tree
    while (current?.parentId) {
      const parent = orgNodes.find(n => n.id === current?.parentId);
      if (parent) {
        list.push(parent);
        current = parent;
      } else {
        break;
      }
    }
    return list;
  }, [myNode, orgNodes]);

  const topics = [
    { id: 'training', label: 'Training & Development', icon: GraduationCap },
    { id: 'safety', label: 'Safety & Wellbeing', icon: Shield },
    { id: 'access', label: 'Access & Permissions', icon: Settings },
    { id: 'admin', label: 'Admin Help', icon: HelpCircle },
  ];

  const getContactsForTopic = (topicId: string) => {
    if (orgNodes.length === 0) return [];

    let specificNode: MockOrgTreeNode | undefined;
    if (topicId === 'safety') {
      specificNode = orgNodes.find(n => n.name.toLowerCase().includes('safety'));
    } else if (topicId === 'training') {
      specificNode = orgNodes.find(n => n.name.toLowerCase().includes('training'));
    } else if (topicId === 'admin' || topicId === 'access') {
      specificNode = orgNodes.find(n => n.name.toLowerCase().includes('admin') || n.name.toLowerCase().includes('commander'));
    }

    const contacts = [];
    if (specificNode && specificNode.assignedMemberId) {
      contacts.push({ roleLabel: specificNode.name, memberId: specificNode.assignedMemberId, isPrimary: true });
    } else if (chain.length > 0) {
      contacts.push({ roleLabel: chain[0].name, memberId: chain[0].assignedMemberId, isPrimary: true });
      if (chain.length > 1) {
        contacts.push({ roleLabel: chain[1].name, memberId: chain[1].assignedMemberId, isPrimary: false });
      }
    } else {
      // fallback to network owner if no chain
      if (network?.ownerId) {
        contacts.push({ roleLabel: 'Network Owner', memberId: network.ownerId, isPrimary: true });
      }
    }
    return contacts.filter(c => c.memberId);
  };

  const contacts = selectedTopic ? getContactsForTopic(selectedTopic) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-card shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border-default bg-surface-header px-4 py-3">
          <h2 className="text-lg font-bold text-text-primary">Find the right person</h2>
          <button onClick={onClose} className="rounded-full p-2 text-text-secondary hover:bg-surface-hover">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 flex-1">
          {!selectedTopic ? (
            <div>
              <p className="mb-4 text-sm text-text-secondary">
                Select a topic to find the appropriate point of contact based on the network's structure.
              </p>
              <div className="space-y-2">
                {topics.map(topic => {
                  const Icon = topic.icon;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border-default bg-background-primary p-3 text-left hover:bg-surface-hover"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-card border border-border-default">
                        <Icon size={20} className="text-text-primary" />
                      </div>
                      <span className="flex-1 font-medium text-text-primary">{topic.label}</span>
                      <ChevronRight size={18} className="text-text-secondary" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="mb-4 flex items-center gap-1 text-sm font-medium text-accent-primary hover:underline"
              >
                ← Back to topics
              </button>
              
              <h3 className="mb-4 text-base font-bold text-text-primary">
                {topics.find(t => t.id === selectedTopic)?.label} Contacts
              </h3>

              {contacts.length === 0 ? (
                <p className="text-sm text-text-secondary">No contacts could be found for this topic.</p>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact, idx) => {
                    const user = users[contact.memberId!];
                    if (!user) return null;
                    return (
                      <div key={idx} className="flex items-center justify-between rounded-xl border border-border-default bg-background-primary p-3">
                        <div className="flex items-center gap-3">
                          <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full bg-surface-card object-cover" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-text-primary">{user.name}</span>
                              <span className="rounded bg-surface-card px-1.5 py-0.5 text-[10px] font-bold text-text-secondary uppercase">
                                {contact.isPrimary ? 'Primary' : 'Backup'}
                              </span>
                            </div>
                            <span className="text-xs text-text-secondary">{contact.roleLabel}</span>
                          </div>
                        </div>
                        <button className="rounded-lg bg-accent-primary px-3 py-1.5 text-sm font-bold text-accent-readable hover:bg-accent-hover">
                          Message
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
