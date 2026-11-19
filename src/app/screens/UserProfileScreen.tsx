import { Activity, AlertTriangle, Bell, Image as ImageIcon, Info, LogOut, Mail, Paintbrush, Phone, ShieldCheck, ShieldQuestion, UserRound, Users, Camera, Video, X, ImagePlus, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { Switch } from "../components/ui/switch";
import { useMockAppState } from "../state/mockAppState";
import { MemberProfilePopover } from "../components/ui/MemberProfilePopover";
import { TrustRingsVisual } from "../components/ui/TrustRingsVisual";
import { AvatarLightbox } from "../components/ui/AvatarLightbox";
import { TrustReviewModal } from "../components/trust/TrustReviewModal";
import { StoredMediaPreview } from "../components/chat/StoredAttachment";
import { ChatAppearancePanel } from "../components/chat/ChatAppearancePanel";
import { mutualNetworks, mutualTrustedContacts, TRUST_PROTOTYPE_WARNING, trustLevelInfo } from "../state/trust";
import { logQaEvent } from "../qa/qaEvents";

type ProfileTab = "info" | "media" | "activity" | "trust" | "chat";

const PROFILE_TABS: { id: ProfileTab; label: string; icon: typeof Info }[] = [
  { id: "info", label: "Info", icon: Info },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "trust", label: "Trust", icon: ShieldCheck },
  { id: "chat", label: "Chat Settings", icon: Paintbrush },
];

const AVATAR_COLORS = [
  "bg-slate-600", "bg-red-600", "bg-orange-600", "bg-amber-600",
  "bg-green-600", "bg-emerald-600", "bg-teal-600", "bg-cyan-600",
  "bg-blue-600", "bg-indigo-600", "bg-violet-600", "bg-purple-600",
  "bg-fuchsia-600", "bg-pink-600", "bg-rose-600"
];

export function UserProfileScreen() {
  const { userId } = useParams();
  const {
    me,
    users,
    networks,
    chatList,
    messages,
    preferences,
    updatePreference,
    clearLocalData,
    updateCurrentUserProfile,
    createDirectChat,
    trustedContacts,
    activityPosts,
    addActivityPost,
    deleteActivityPost,
  } = useMockAppState();
  const navigate = useNavigate();
  const isMe = !userId || userId === me.id;
  const user = isMe ? me : users[userId!];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editStatusMessage, setEditStatusMessage] = useState("");
  const [editAvatarColor, setEditAvatarColor] = useState("");
  const [trustModalOpen, setTrustModalOpen] = useState(false);
  const [newActivityText, setNewActivityText] = useState("");
  const [profileTab, setProfileTab] = useState<ProfileTab>("info");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadata-only QA event when a profile is viewed.
  useEffect(() => {
    if (!user) return;
    logQaEvent({ type: "profile.opened", userId: me.id, targetUserId: user.id, success: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const trustRecord = user && !isMe ? trustedContacts[user.id] : undefined;
  const sharedNetworks = user && !isMe ? mutualNetworks(me.id, user.id, networks) : [];
  const mutualTrusted = user && !isMe ? mutualTrustedContacts(user.id, trustedContacts, networks) : [];
  const userActivity = user ? activityPosts[user.id] ?? [] : [];

  // Direct chat with this contact (if one exists) — powers Media and Chat Settings.
  const directChat = user && !isMe
    ? Object.values(chatList).find(
        (chat) => chat.type === "direct"
          && chat.participants.includes(me.id)
          && chat.participants.includes(user.id),
      )
    : undefined;
  const sharedImages = directChat
    ? (messages[directChat.id] || [])
        .filter((message) => message.attachment && (message.attachment.type === "image" || message.attachment.type === "gif"))
        .map((message) => message.attachment!)
        .slice()
        .reverse()
    : [];

  const openProfileTab = (tab: ProfileTab) => {
    setProfileTab(tab);
    if (tab === "media") {
      // Metadata only — never media contents.
      logQaEvent({ type: "media.grid.opened", userId: me.id, targetUserId: user?.id, success: true });
    }
  };

  // The Trusted Contacts list comes from real local trust records now.
  const trustedContactCards = Object.values(trustedContacts)
    .map((record) => ({ record, contact: users[record.userId] }))
    .filter((entry) => Boolean(entry.contact));

  const handleClear = () => {
    if (!window.confirm("Clear AegisNet prototype messages, file metadata, and saved selections from this browser?")) return;
    clearLocalData();
  };

  const handleStartEdit = () => {
    setEditName(user.name);
    setEditUsername(user.username || "");
    setEditBio(user.bio || "");
    setEditStatusMessage(user.statusMessage || "");
    setEditAvatarColor(user.avatarColor || "bg-indigo-600");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    try {
      updateCurrentUserProfile({
        name: editName.trim() || "Unknown User",
        username: editUsername.trim() || undefined,
        bio: editBio.trim() || undefined,
        statusMessage: editStatusMessage.trim() || undefined,
        avatarColor: editAvatarColor,
      });
      logQaEvent({ type: "profile.save.succeeded", userId: me.id, success: true });
      setIsEditing(false);
    } catch {
      logQaEvent({ type: "profile.save.failed", userId: me.id, success: false, reason: "local-save-error" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    logQaEvent({ type: "avatar.upload.attempted", userId: me.id });

    // Accept only safe image formats
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      logQaEvent({ type: "avatar.upload.failed", userId: me.id, success: false, reason: "unsupported-type" });
      alert("Unsupported file type. Please upload a PNG, JPG, or WebP image.");
      return;
    }

    // Allow up to 10MB source files
    if (file.size > 10 * 1024 * 1024) {
      logQaEvent({ type: "avatar.upload.failed", userId: me.id, success: false, reason: "too-large" });
      alert("Image must be smaller than 10MB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      
      // Resize to 512x512
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL("image/webp", 0.8);
        updateCurrentUserProfile({ profilePictureUrl: dataUrl });
        logQaEvent({ type: "avatar.upload.succeeded", userId: me.id, success: true });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePicture = () => {
    if (window.confirm("Remove your profile picture?")) {
      updateCurrentUserProfile({ profilePictureUrl: undefined });
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <UserRound size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-text-primary">User not found</h2>
          <p className="mt-2 text-sm text-text-secondary">This profile does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-clean bg-background-primary p-4 pb-24 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent-readable">{isMe ? "Local prototype settings" : "User Profile"}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{isMe ? "Profile & Safety" : user.name}</h1>
            {isMe && <p className="mt-2 text-sm text-text-secondary">Manage your demo profile, privacy preferences, trusted contacts, and local data.</p>}
          </div>
          {!isMe && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const chatId = createDirectChat(user.id);
                  navigate(`/app/private/dm/${chatId}`);
                }}
                className="rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-hover flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                Message
              </button>
              <button
                onClick={() => {
                  const chatId = createDirectChat(user.id);
                  navigate(`/app/private/dm/${chatId}/call/voice`);
                }}
                className="rounded-xl border border-border-default bg-surface-card px-5 py-2.5 text-sm font-bold text-text-primary hover:bg-surface-hover flex items-center justify-center gap-2"
              >
                <Phone size={16} />
                Call
              </button>
              <button
                onClick={() => setTrustModalOpen(true)}
                className="rounded-xl border border-border-default bg-surface-card px-5 py-2.5 text-sm font-bold text-text-primary hover:bg-surface-hover flex items-center justify-center gap-2"
              >
                <ShieldQuestion size={16} />
                {trustRecord ? "Review Trust" : "Add Trusted Contact"}
              </button>
            </div>
          )}
        </header>

        <section className="rounded-3xl border border-border-default bg-surface-card p-6 shadow-sm flex flex-col md:flex-row md:items-start gap-6 relative">
          {isEditing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 animate-in fade-in">
              <div className="w-full max-w-4xl max-h-full bg-surface-card rounded-3xl flex flex-col shadow-2xl border border-accent-primary/20 overflow-hidden zoom-in-95">
                <div className="flex justify-between items-center px-6 py-4 border-b border-border-default bg-background-primary shrink-0">
                <h2 className="text-xl font-bold">Edit Profile</h2>
                <button onClick={() => setIsEditing(false)} className="p-2 text-text-muted hover:bg-surface-hover rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 scrollbar-clean flex flex-col md:flex-row gap-8">
                {/* Preview Column */}
                <div className="shrink-0 flex flex-col items-center gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Preview</h3>
                  <div className="w-48 rounded-2xl border border-border-default bg-background-secondary p-4 flex flex-col items-center text-center shadow-sm">
                    <div className="relative group mb-3">
                      <div className={`h-24 w-24 rounded-full text-3xl font-black text-white flex items-center justify-center overflow-hidden border-4 border-surface-card shadow-sm ${editAvatarColor}`}>
                        {user.profilePictureUrl && !preferences.lowBandwidthMode ? (
                          <img src={user.profilePictureUrl} alt={editName} className="h-full w-full object-cover" />
                        ) : (editName ? editName.charAt(0).toUpperCase() : "?")}
                      </div>
                      <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors" title="Change picture">
                          <ImagePlus size={16} />
                        </button>
                        {user.profilePictureUrl && (
                          <button onClick={handleRemovePicture} className="p-1.5 bg-danger/80 text-white rounded-full hover:bg-danger transition-colors" title="Remove picture">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-text-primary break-words w-full truncate">{editName || "Anonymous"}</p>
                    <p className="text-xs font-semibold text-text-muted truncate w-full">{editUsername ? `@${editUsername}` : `@${(editName || "anon").toLowerCase().replace(/\s+/g, '')}`}</p>
                    {editStatusMessage && <p className="mt-2 text-xs font-medium bg-background-primary w-fit px-2 py-1 rounded-lg border border-border-default inline-block">{editStatusMessage}</p>}
                  </div>
                  <p className="text-[10px] text-text-muted text-center max-w-[190px]">
                    Profile pictures are stored locally in this prototype. 10MB limit. PNG, JPG, WebP.
                  </p>
                </div>
                
                {/* Fields Column */}
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">Display Name</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-background-secondary border border-border-default rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">Username</label>
                    <input value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full bg-background-secondary border border-border-default rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">Status Message</label>
                    <input value={editStatusMessage} onChange={e => setEditStatusMessage(e.target.value)} placeholder="e.g., Working on UI updates" className="w-full bg-background-secondary border border-border-default rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">Avatar Color</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setEditAvatarColor(color)}
                          className={`h-8 w-8 rounded-full ${color} transition-all ${editAvatarColor === color ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-card scale-110' : 'hover:scale-105'}`}
                          title={color.replace('bg-', '').replace('-600', '')}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">Bio</label>
                    <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell others about yourself..." className="w-full bg-background-secondary border border-border-default rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary min-h-[100px] resize-none" />
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-border-default bg-background-primary flex justify-end gap-3 shrink-0">
                <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface-hover rounded-xl transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} className="px-6 py-2.5 text-sm font-bold text-white bg-accent-primary hover:bg-accent-hover rounded-xl transition-colors">Save Changes</button>
              </div>
            </div>
            </div>
          )}
          
          <div className="relative group shrink-0">
            <AvatarLightbox user={user}>
              <div className={`h-24 w-24 rounded-full text-2xl font-black text-white flex items-center justify-center overflow-hidden border-4 border-surface-card ${user.avatarColor}`}>
                {user.profilePictureUrl && !preferences.lowBandwidthMode ? (
                  <img src={user.profilePictureUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : user.initials}
              </div>
            </AvatarLightbox>
            {isMe && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-accent-primary text-white rounded-full hover:bg-accent-hover shadow-md border-2 border-surface-card z-10 transition-transform hover:scale-110"
                title="Change picture"
              >
                <Camera size={14} />
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileSelect} />
          </div>
          
          <div className="mt-2 flex-1 md:mt-0 min-w-0">
            <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2 flex-wrap">
              <span className="truncate">{user.name}</span>
              {user.localTrust && <ShieldCheck size={18} className="text-success shrink-0" title={user.localTrust} />}
            </h2>
            <p className="mt-1 font-semibold text-text-muted truncate">
              {user.username ? `@${user.username}` : `@${user.name.toLowerCase().replace(/\s+/g, '')}`}
            </p>
            {user.statusMessage && (
              <p className="mt-3 text-sm font-medium text-text-primary bg-background-primary w-fit px-3 py-1.5 rounded-lg border border-border-default">
                {user.statusMessage}
              </p>
            )}
            {user.bio && (
              <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-2xl whitespace-pre-wrap">
                {user.bio}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <span>Member since {user.memberSince || "2026"}</span>
              {user.role && <span>Role: {user.role}</span>}
              {!isMe && trustRecord && (
                <span className="flex items-center gap-1 text-success">
                  <ShieldCheck size={13} /> {trustLevelInfo(trustRecord.level).label} (local label)
                </span>
              )}
            </div>
          </div>
          {isMe && (
            <button onClick={handleStartEdit} className="mt-5 rounded-xl border border-border-default bg-background-secondary px-5 py-2.5 text-sm font-bold text-text-primary hover:bg-surface-hover md:mt-0 whitespace-nowrap self-start">
              Edit profile
            </button>
          )}
        </section>

        {!isMe && (
          <>
            <section className="overflow-hidden rounded-3xl border border-border-default bg-surface-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border-default px-5 py-4">
                <ShieldCheck size={19} className="text-success" />
                <div>
                  <h2 className="text-base font-bold text-text-primary">Trust & connections</h2>
                  <p className="text-xs text-text-muted">Local prototype labels — not identity verification</p>
                </div>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="rounded-2xl border border-border-default bg-background-secondary p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Trust level</h3>
                  {trustRecord ? (
                    <div className="mt-2 space-y-1.5 text-sm">
                      <p className="font-bold text-text-primary flex items-center gap-1.5">
                        <ShieldCheck size={15} className="text-success" />
                        {trustLevelInfo(trustRecord.level).label}
                      </p>
                      {trustRecord.reason && <p className="text-xs text-text-secondary">Reason: {trustRecord.reason}</p>}
                      <p className="text-xs text-text-muted">Marked by you · {new Date(trustRecord.trustedAt).toLocaleDateString()}</p>
                      <p className="text-xs text-text-muted">Last reviewed {new Date(trustRecord.lastReviewedAt).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-text-secondary">No trust label set. Use “Add Trusted Contact” to organize people you know.</p>
                  )}
                  <button
                    onClick={() => setTrustModalOpen(true)}
                    className="mt-3 rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-hover"
                  >
                    {trustRecord ? "Review trust" : "Add Trusted Contact"}
                  </button>
                </div>
                <div className="rounded-2xl border border-border-default bg-background-secondary p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Mutual Networks</h3>
                  {sharedNetworks.length ? (
                    <ul className="mt-2 space-y-1.5">
                      {sharedNetworks.map((network) => (
                        <li key={network.id} className="flex items-center gap-2 text-sm text-text-primary">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-[9px] font-black text-white ${network.color}`}>{network.initials}</span>
                          {network.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-text-secondary">No Mutual Networks yet.</p>
                  )}
                  <p className="mt-3 text-xs text-text-muted">
                    Mutual Trusted Contacts: <span className="font-bold text-text-primary">{mutualTrusted.length}</span>
                  </p>
                </div>
              </div>
              <p className="border-t border-border-default px-5 py-3 text-xs leading-relaxed text-text-muted">
                {TRUST_PROTOTYPE_WARNING}
              </p>
            </section>

            <section className="overflow-hidden rounded-3xl border border-border-default bg-surface-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border-default px-5 py-4">
                <ImageIcon size={19} className="text-accent-primary" />
                <div>
                  <h2 className="text-base font-bold text-text-primary">Shared Media</h2>
                  <p className="text-xs text-text-muted">Photos and GIFs shared in direct messages</p>
                </div>
              </div>
              <div className="p-5">
                {sharedImages.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {sharedImages.map((attachment, idx) => (
                      <StoredMediaPreview 
                        key={attachment.storageId || idx} 
                        attachment={attachment} 
                        className="aspect-square w-full object-cover rounded-xl"
                        expandable 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm font-bold text-text-primary">No media shared yet</p>
                    <p className="mt-1 text-xs text-text-secondary">Send a photo or GIF in the private chat, and it will appear here.</p>
                  </div>
                )}
              </div>
            </section>

            <ActivitySection
              isMe={false}
              posts={userActivity}
              newText=""
              onNewTextChange={() => undefined}
              onAddPost={() => undefined}
              onDeletePost={() => undefined}
            />

            {directChat && (
              <section className="overflow-hidden rounded-3xl border border-border-default bg-surface-card shadow-sm p-5">
                <ChatAppearancePanel targetId={directChat.id} />
              </section>
            )}
          </>
        )}

        {isMe && (
          <>

        <ActivitySection
          isMe
          posts={userActivity}
          newText={newActivityText}
          onNewTextChange={setNewActivityText}
          onAddPost={() => {
            addActivityPost(newActivityText);
            setNewActivityText("");
          }}
          onDeletePost={deleteActivityPost}
        />

        <section className="overflow-hidden rounded-3xl border border-border-default bg-surface-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border-default px-5 py-4">
            <Bell size={19} className="text-accent-primary" />
            <div>
              <h2 className="text-base font-bold text-text-primary">Privacy & safety preferences</h2>
              <p className="text-xs text-text-muted">Local-only — saved in this browser, not enforced by a backend</p>
            </div>
          </div>
          <div className="divide-y divide-border-default">
            <PreferenceRow
              title="Read receipts"
              body="When off, delivery and read state are hidden on your outgoing prototype messages."
              checked={preferences.readReceipts}
              onChange={(checked) => updatePreference("readReceipts", checked)}
            />
            <PreferenceRow
              title="Safety check-in reminders"
              body="When off, the Safety check-ins panel is muted on the dashboard."
              checked={preferences.safetyCheckReminders}
              onChange={(checked) => updatePreference("safetyCheckReminders", checked)}
            />
            <PreferenceRow
              title="Allow group invitations"
              body="When off, redeeming a private-group invitation code is blocked with a warning."
              checked={preferences.groupInvites}
              onChange={(checked) => updatePreference("groupInvites", checked)}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-border-default bg-surface-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border-default px-5 py-4">
            <Users size={19} className="text-success" />
            <div>
              <h2 className="text-base font-bold text-text-primary">Trusted Contacts</h2>
              <p className="text-xs text-text-muted">Local-only prototype labels — not identity verification</p>
            </div>
          </div>
          {isMe && (
            <div className="p-5 border-b border-border-default">
              <TrustRingsVisual 
                userId={user.id}
                innerRingCount={trustedContactCards.filter(c => c.record.level >= 3).length} 
                outerRingCount={trustedContactCards.filter(c => c.record.level < 3).length} 
              />
            </div>
          )}
          {trustedContactCards.length === 0 ? (
            <div className="p-8 text-center bg-surface-card border-y sm:border sm:rounded-2xl border-border-default mb-8">
              <p className="text-sm font-bold text-text-primary">No Trusted Contacts yet</p>
              <p className="mt-1 text-xs text-text-secondary">
                Open someone's profile and choose “Add Trusted Contact” to start organizing people you know.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              {trustedContactCards.map(({ record, contact }) => (
                <div key={contact!.id} className="flex flex-col rounded-2xl border border-border-default bg-background-secondary p-4">
                  <button
                    onClick={() => navigate(`/app/profile/${contact!.id}`)}
                    className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-xl"
                    aria-label={`Open profile for ${contact!.name}`}
                  >
                    <div className={`h-11 w-11 rounded-full text-xs font-bold text-white flex items-center justify-center overflow-hidden ${contact!.avatarColor}`}>
                      {contact!.profilePictureUrl && !preferences.lowBandwidthMode
                        ? <img src={contact!.profilePictureUrl} alt={contact!.name} className="h-full w-full object-cover" />
                        : contact!.initials}
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-text-primary hover:underline">{contact!.name}</h3>
                  </button>
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-success">
                    <ShieldCheck size={12} /> {trustLevelInfo(record.level).label}
                  </p>
                  {record.reason && <p className="mt-0.5 text-xs text-text-muted truncate">{record.reason}</p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        const chatId = createDirectChat(contact!.id);
                        navigate(`/app/private/dm/${chatId}`);
                      }}
                      className="rounded-lg border border-border-default px-2 py-1 text-[11px] font-bold text-text-primary hover:bg-surface-hover"
                    >
                      Message
                    </button>
                    <button
                      onClick={() => navigate(`/app/profile/${contact!.id}`)}
                      className="rounded-lg border border-border-default px-2 py-1 text-[11px] font-bold text-text-primary hover:bg-surface-hover"
                    >
                      Review Trust
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="border-t border-border-default px-5 py-3 text-xs leading-relaxed text-text-muted">
            {TRUST_PROTOTYPE_WARNING}
          </p>
        </section>

        <section className="rounded-3xl border border-accent-primary/25 bg-accent-primary/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-accent-primary" />
            <div>
              <h2 className="text-sm font-bold text-text-primary">Security preview</h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                The interface is designed for future encryption and device trust work. Production encryption, authentication, MFA, and passkeys are not implemented.
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-danger/30 bg-danger/5">
          <div className="flex items-center gap-3 border-b border-danger/20 px-5 py-4">
            <AlertTriangle size={19} className="text-danger" />
            <h2 className="text-base font-bold text-danger">Local data controls</h2>
          </div>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Clear prototype data</h3>
              <p className="mt-1 max-w-lg text-xs leading-relaxed text-text-secondary">Removes AegisNet messages, file metadata, preferences, and saved navigation from this browser after confirmation.</p>
            </div>
            <button onClick={handleClear} className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
              Clear local data
            </button>
          </div>
        </section>

        <div className="flex justify-center pb-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 rounded-full border border-border-default bg-surface-card px-6 py-3 text-sm font-bold text-text-secondary hover:bg-surface-hover hover:text-text-primary">
            <LogOut size={16} />
            Return to sign in
          </button>
        </div>
          </>
        )}

        {!isMe && (
          <TrustReviewModal user={user} open={trustModalOpen} onClose={() => setTrustModalOpen(false)} />
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function ActivitySection({
  isMe,
  posts,
  newText,
  onNewTextChange,
  onAddPost,
  onDeletePost,
}: {
  isMe: boolean;
  posts: { id: string; text: string; createdAt: string }[];
  newText: string;
  onNewTextChange: (text: string) => void;
  onAddPost: () => void;
  onDeletePost: (postId: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border-default bg-surface-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border-default px-5 py-4">
        <Activity size={19} className="text-accent-primary" />
        <div>
          <h2 className="text-base font-bold text-text-primary">Activity</h2>
          <p className="text-xs text-text-muted">Local-only prototype status updates — stay on this device, never logged or exported</p>
        </div>
      </div>
      {isMe && (
        <div className="flex gap-2 border-b border-border-default p-4">
          <input
            value={newText}
            onChange={(event) => onNewTextChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") onAddPost(); }}
            placeholder="Share a short update (saved locally only)…"
            maxLength={280}
            aria-label="New activity update"
            className="flex-1 rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          <button
            onClick={onAddPost}
            disabled={!newText.trim()}
            className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Post
          </button>
        </div>
      )}
      {posts.length === 0 ? (
        <p className="p-6 text-center text-sm text-text-secondary">
          {isMe ? "No updates yet. Share a short status to try the Activity prototype." : "No recent activity."}
        </p>
      ) : (
        <ul className="divide-y divide-border-default">
          {posts.map((post) => (
            <li key={post.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap break-words">{post.text}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">{formatRelativeTime(post.createdAt)}</p>
              </div>
              {isMe && (
                <button
                  onClick={() => onDeletePost(post.id)}
                  aria-label="Delete this update"
                  className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PreferenceRow({ title, body, checked, onChange }: { title: string; body: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-5 p-5">
      <div className="flex gap-3">
        <UserRound size={18} className="mt-0.5 shrink-0 text-text-muted" />
        <div>
          <h3 className="text-sm font-bold text-text-primary">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">{body}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
