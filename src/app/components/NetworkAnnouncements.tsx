import React from "react";
import { Megaphone, Pin, Link as LinkIcon, FileText, Hash } from "lucide-react";
import { useMockAppState } from "../state/mockAppState";

export function NetworkAnnouncements({ networkId }: { networkId: string }) {
  const { networks, users } = useMockAppState();
  const network = networks[networkId];

  if (!network) return null;

  const announcements = network.announcements || [];
  const pinnedResources = network.pinnedResources || [];

  if (announcements.length === 0 && pinnedResources.length === 0) {
    return null; // Or show a placeholder if desired
  }

  return (
    <div className="space-y-6">
      {announcements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone className="text-accent-primary" size={18} />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Announcements</h2>
          </div>
          <div className="grid gap-3">
            {announcements.map((ann) => {
              const author = users[ann.authorId];
              return (
                <div key={ann.id} className={`rounded-xl border ${ann.important ? 'border-danger/50 bg-danger/5' : 'border-border-default bg-surface-card'} p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold text-text-primary">{ann.title}</h3>
                    {ann.important && (
                      <span className="text-[10px] font-bold text-danger uppercase bg-danger/10 px-1.5 py-0.5 rounded">Important</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary whitespace-pre-wrap">{ann.body}</p>
                  <div className="mt-3 text-[10px] text-text-muted">
                    Posted by {author ? author.name : "Unknown"} on {new Date(ann.createdAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pinnedResources.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Pin className="text-accent-primary" size={18} />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Pinned Resources</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {pinnedResources.map((res) => {
              return (
                <div key={res.id} className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-card p-3 hover:border-accent-primary/50 transition-colors cursor-pointer w-full sm:w-auto sm:min-w-[200px]">
                  <div className="h-8 w-8 rounded bg-background-secondary flex items-center justify-center text-text-muted shrink-0">
                    {res.url ? <LinkIcon size={16} /> : res.roomId ? <Hash size={16} /> : res.vaultFileId ? <FileText size={16} /> : <Pin size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{res.title}</p>
                    <p className="text-[10px] text-text-muted truncate">
                      {res.url ? "External Link" : res.roomId ? "Room Link" : res.vaultFileId ? "Vault File" : "Resource"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
