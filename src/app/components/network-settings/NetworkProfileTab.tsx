import { useState, useRef } from "react";
import { useMockAppState } from "../../state/mockAppState";
import { logQaEvent } from "../../qa/qaEvents";
import { Camera, ShieldCheck, X } from "lucide-react";

export function NetworkProfileTab({ network }: { network: any }) {
  const { me, networkProfiles, updateNetworkProfile } = useMockAppState();
  const profile = networkProfiles[network.id] || {};

  const [nickname, setNickname] = useState(profile.displayName || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updateNetworkProfile(network.id, { 
      ...profile, 
      displayName: nickname.trim() || undefined,
      bio: bio.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
    });
    // Log metadata ONLY, never the bio text or image binary
    logQaEvent({ 
      type: "network.profile.changed", 
      userId: me.id, 
      networkId: network.id, 
      success: true,
      fieldsUpdated: [
        nickname !== profile.displayName ? "displayName" : null,
        bio !== profile.bio ? "bio" : null,
        avatarUrl !== profile.avatarUrl ? "avatarUrl" : null,
      ].filter(Boolean) as string[]
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Only PNG, JPG, and WebP images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
      }
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-2xl border border-border-default bg-surface-card p-6">
        <h3 className="text-base font-bold text-text-primary">Profile in this Network</h3>
        <p className="mt-1 text-sm text-text-secondary mb-6">
          Set a specific display name, bio, and photo for yourself in <strong>{network.name}</strong>. If left blank, your global profile will be used.
        </p>

        <div className="flex items-center gap-2 mb-6 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-xs text-warning">
          <ShieldCheck size={14} className="shrink-0" />
          <p><strong>Local-only Prototype:</strong> Network-specific avatars and bios are currently stored locally.</p>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border-default bg-background-secondary flex items-center justify-center text-white font-bold text-2xl ${!avatarUrl ? profile.avatarColor || me.avatarColor : ""}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
              ) : (
                nickname ? nickname.substring(0, 2).toUpperCase() : me.name.substring(0, 2).toUpperCase()
              )}
            </div>
            
            <div className="space-y-2 flex-1">
              <label className="block text-xs font-bold text-text-muted">Network Avatar</label>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-surface-hover px-3 py-1.5 text-sm font-bold text-text-primary hover:bg-surface-selected transition-colors"
                >
                  <Camera size={14} /> Upload Photo
                </button>
                {avatarUrl && (
                  <button 
                    onClick={() => setAvatarUrl(null)}
                    className="flex items-center gap-1 rounded-xl text-danger-readable px-2 py-1.5 text-xs font-bold hover:bg-danger/10 transition-colors"
                  >
                    <X size={14} /> Remove
                  </button>
                )}
              </div>
              {error && <p className="text-xs text-danger-readable">{error}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1">Network Nickname</label>
            <input 
              value={nickname} 
              onChange={e => setNickname(e.target.value)} 
              placeholder={me.name}
              className="w-full bg-background-secondary border border-border-default rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary" 
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-text-muted">Bio in this Network</label>
              <span className={`text-[10px] ${bio.length > 250 ? "text-danger-readable font-bold" : "text-text-muted"}`}>
                {bio.length} / 250
              </span>
            </div>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              placeholder="A brief bio..."
              rows={3}
              className="w-full bg-background-secondary border border-border-default rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none" 
            />
          </div>
          
          <div className="pt-2 flex items-center justify-end gap-3">
            {saved && <span className="text-xs font-bold text-success" role="status">Saved locally</span>}
            <button 
              onClick={handleSave} 
              disabled={bio.length > 250}
              className="px-6 py-2.5 text-sm font-bold text-white bg-accent-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              Save Profile
            </button>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border-default bg-surface-card p-6">
        <h3 className="text-base font-bold text-text-primary">Your Roles in this Network</h3>
        <p className="mt-1 text-sm text-text-secondary mb-6">
          Roles define your access level and how you can be mentioned.
        </p>
        
        {network.roles && network.roles.length > 0 ? (
          (() => {
            const myRoleIds = network.memberRoles?.[me.id] || [];
            const myRoles = myRoleIds.map((id: string) => network.roles.find((r: any) => r.id === id)).filter(Boolean);
            
            if (myRoles.length === 0) {
              return <p className="text-sm text-text-muted">You do not have any assigned roles in this network.</p>;
            }

            return (
              <div className="space-y-4">
                {myRoles.map((role: any) => (
                  <div key={role.id} className="flex flex-col gap-1 p-3 rounded-xl border border-border-default bg-background-secondary">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${role.color || "bg-accent-primary"}`}></span>
                      <span className="text-sm font-bold text-text-primary">{role.name}</span>
                    </div>
                    <p className="text-xs text-text-muted pl-5">
                      Can be mentioned as <span className="font-bold text-text-secondary">@{role.name.replace(/\s+/g, "")}</span>
                    </p>
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <p className="text-sm text-text-muted">This network does not have any roles defined.</p>
        )}
      </div>
    </div>
  );
}
