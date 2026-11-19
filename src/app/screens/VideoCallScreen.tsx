import {
  Activity, Camera, CameraOff, Gauge, Mic, MicOff,
  PhoneOff, RotateCcw, ShieldCheck, Volume2, VolumeX, Radio, MonitorUp, MonitorOff, Video, Settings2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { clsx } from "clsx";
import { CallState, useMockAppState } from "../state/mockAppState";
import { LocalMediaPanel } from "../components/calls/LocalMediaPanel";
import { ScreenSharePreview } from "../components/calls/ScreenSharePreview";
import { MemberProfilePopover } from "../components/ui/MemberProfilePopover";
import { logQaEvent } from "../qa/qaEvents";

const stateLabels: Record<CallState, string> = {
  "secure-connected": "Good",
  "weak-signal": "Unstable",
  "reconnecting": "Reconnecting",
  "restoring-audio": "Unstable",
  "restoring-video": "Unstable",
  "audio-fallback": "Unstable",
  "text-fallback": "Disconnected",
  "back-online": "Good",
};

export function VideoCallScreen() {
  const { groupChatId, networkId, roomId, callType, callId } = useParams();
  const {
    chatList,
    networks,
    users,
    me,
    callState,
    setCallState,
    startPrototypeCall,
    endPrototypeCall,
    activeVoiceVideoRooms,
    joinRoomSession,
    leaveRoomSession,
  } = useMockAppState();
  const navigate = useNavigate();
  const mode = callType === "voice" ? "voice" : "video";
  const resolvedRoomId = roomId || callId;
  const isNetworkRoom = !!roomId;
  const groupChat = groupChatId ? chatList[groupChatId] : undefined;
  const network = networkId ? networks[networkId] : undefined;
  const room = network?.rooms.flatMap((section) => section.items).find((item) => item.id === resolvedRoomId);
  const title = groupChat?.name || room?.name || "Group call";
  const participantIds = groupChat?.participants || [me.id, ...Object.keys(users).slice(0, 5)];
  const participants = participantIds.map((id) => id === me.id ? me : users[id]).filter(Boolean);

  const [hasJoined, setHasJoined] = useState(!isNetworkRoom);
  const [mediaRequested, setMediaRequested] = useState(!isNetworkRoom);

  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(mode === "video");
  const [speakerOn, setSpeakerOn] = useState(true);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transportMode, setTransportMode] = useState("Auto");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [deviceAlert, setDeviceAlert] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [devicePanelOpen, setDevicePanelOpen] = useState(false);
  const [inWaitingRoom, setInWaitingRoom] = useState(room?.visibility === "restricted");
  const [focusedParticipantId, setFocusedParticipantId] = useState<string | null>(null);

  useEffect(() => {
    if (callState !== "reconnecting" && callState !== "secure-connected") {
      logQaEvent({ type: "call.connection_state_changed", state: callState, userId: me.id });
    }
  }, [callState, me.id]);

  useEffect(() => {
    logQaEvent({ type: "call.started", mode, targetId: resolvedRoomId, userId: me.id });
  }, []);

  useEffect(() => {
    if (!hasJoined) return;
    
    if (roomId) joinRoomSession(roomId);

    startPrototypeCall({
      mode,
      chatId: groupChatId,
      roomId: resolvedRoomId,
    });
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => {
      window.clearInterval(timer);
      timers.current.forEach(window.clearTimeout);
      endPrototypeCall();
      if (roomId) leaveRoomSession(roomId);
    };
  }, [hasJoined, endPrototypeCall, groupChatId, mode, resolvedRoomId, startPrototypeCall, roomId, joinRoomSession, leaveRoomSession]);

  const requestMedia = () => {
    setMediaError(null);
    let activeStream: MediaStream | null = null;
    if (mode === "video") {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then(s => {
          activeStream = s;
          setStream(s);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.error("Camera permission denied", err);
          setMediaError("Camera or microphone permission denied or device not found.");
        });
    } else {
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(s => {
          activeStream = s;
          setStream(s);
        })
        .catch(err => {
          console.error("Mic permission denied", err);
          setMediaError("Microphone permission denied or device not found.");
        });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  };

  useEffect(() => {
    if (!mediaRequested) return;
    const cleanup = requestMedia();
    return cleanup;
  }, [mode, mediaRequested]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (participants.length > 0) {
        const randomId = participants[Math.floor(Math.random() * participants.length)].id;
        setActiveSpeakerId(randomId);
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [participants]);

  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = cameraOn);
    }
  }, [cameraOn, stream]);

  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream, cameraOn, hasJoined, mediaRequested]);

  useEffect(() => {
    const handleDeviceChange = () => {
      setDeviceAlert("Hardware device changed. Please check your camera and microphone settings.");
      setTimeout(() => setDeviceAlert(null), 5000);
    };
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
  }, []);

  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = !muted);
    }
  }, [muted, stream]);

  const schedule = (state: CallState, delay: number) => {
    timers.current.push(window.setTimeout(() => setCallState(state), delay));
  };

  const simulateReconnect = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setCallState("weak-signal");
    schedule("reconnecting", 900);
    schedule("restoring-audio", 1800);
    schedule("restoring-video", 2700);
    schedule("audio-fallback", 3600);
    schedule("text-fallback", 4500);
    schedule("back-online", 5400);
    schedule("secure-connected", 6500);
  };

  const endCall = () => {
    endPrototypeCall();
    if (roomId) leaveRoomSession(roomId);
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
    }
    if (isNetworkRoom) {
      setHasJoined(false);
      setMediaRequested(false);
      setSeconds(0);
    } else if (groupChatId) {
      navigate(`/app/private/group/${groupChatId}`);
    } else {
      navigate(`/app`);
    }
  };

  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      logQaEvent({ type: "screenshare.stopped", userId: me.id, roomId: resolvedRoomId, success: true });
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(s);
      logQaEvent({ type: "screenshare.started", userId: me.id, roomId: resolvedRoomId, success: true });
      // Browser "Stop sharing" bar or the OS ending the capture.
      s.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        logQaEvent({ type: "screenshare.track.ended", userId: me.id, roomId: resolvedRoomId, success: true });
      };
    } catch (err) {
      console.error("Screen share error", err);
      setMediaError("Screen share canceled or not permitted.");
      logQaEvent({ type: "screenshare.failed", userId: me.id, roomId: resolvedRoomId, success: false, reason: "canceled-or-denied" });
    }
  };

  // Stop screen capture if the user navigates away while still sharing.
  // (The cleanup also runs when screenStream changes, but stopping an
  // already-stopped track is a safe no-op.)
  useEffect(() => {
    if (!screenStream) return;
    return () => {
      screenStream.getTracks().forEach(t => t.stop());
    };
  }, [screenStream]);

  const formattedTime = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (!hasJoined && isNetworkRoom) {
    const activeParticipants = (roomId && activeVoiceVideoRooms[roomId] ? activeVoiceVideoRooms[roomId] : []).map(id => id === "me" ? me : users[id]).filter(Boolean);
    const demoMembers = [users["user_sarah"], users["user_alex"]].filter(u => u && !activeParticipants.some(ap => ap.id === u.id));
    const allInRoom = [...activeParticipants, ...demoMembers];
    
    return (
      <div className="flex h-full w-full items-center justify-center bg-background-primary text-text-primary p-4 overflow-y-auto scrollbar-clean">
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl bg-surface-card border border-border-default rounded-2xl shadow-lg overflow-hidden my-auto">
          <div className="flex-1 p-8 flex flex-col justify-center">
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <p className="text-sm text-text-muted mb-6 flex items-center gap-2 font-bold uppercase tracking-wider">
              {mode === "video" ? <Video size={16} /> : <Volume2 size={16} />}
              {mode === "video" ? "Video Room" : "Voice Room"}
            </p>
            
            <div className="bg-surface-hover/50 border border-border-default rounded-xl p-4 mb-8">
              <p className="text-sm font-bold text-text-secondary flex items-center gap-2 mb-1">
                <ShieldCheck size={16} className="text-success" />
                Local Prototype Notice
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                {mode === "video" 
                  ? "Video room preview is local in this prototype. Remote video requires WebRTC signaling." 
                  : "Voice room presence is local in this prototype. Remote voice requires WebRTC signaling."}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setMediaRequested(true);
                  setHasJoined(true);
                  if (room?.visibility === "restricted") {
                    setInWaitingRoom(true);
                  }
                }}
                className="bg-accent-primary hover:bg-accent-primary/90 text-white font-bold py-3 px-8 rounded-full shadow-md transition-all"
              >
                Join {mode === "video" ? "Video" : "Voice"}
              </button>
            </div>
          </div>
          
          <div className="flex-1 bg-surface-selected p-8 border-l border-border-default flex flex-col">
            {mode === "video" ? (
               <div className="flex flex-col mb-6">
                 <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">Camera Preview</h2>
                 <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative shadow-inner border border-white/10 flex items-center justify-center">
                   {mediaRequested ? (
                     <>
                       {mediaError ? (
                         <div className="text-center p-4">
                           <p className="text-error text-sm font-bold mb-2">{mediaError}</p>
                           <p className="text-xs text-text-muted">Please check your browser permissions.</p>
                         </div>
                       ) : (
                         <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover transform scale-x-[-1]" />
                       )}
                       <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                         <button onClick={() => setMuted(!muted)} className={clsx("p-3 rounded-full", muted ? "bg-red-500/80 text-white" : "bg-white/20 text-white backdrop-blur hover:bg-white/30")} title="Toggle Microphone">
                           {muted ? <MicOff size={20} /> : <Mic size={20} />}
                         </button>
                         <button onClick={() => setCameraOn(!cameraOn)} className={clsx("p-3 rounded-full", !cameraOn ? "bg-red-500/80 text-white" : "bg-white/20 text-white backdrop-blur hover:bg-white/30")} title="Toggle Camera">
                           {cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
                         </button>
                       </div>
                     </>
                   ) : (
                     <div className="text-center p-6 flex flex-col items-center">
                       <CameraOff size={48} className="mb-4 text-white/30" />
                       <p className="text-white/60 text-sm mb-4">Camera is currently off</p>
                       <button onClick={() => setMediaRequested(true)} className="bg-white/10 border border-white/20 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                         Test camera
                       </button>
                     </div>
                   )}
                 </div>
               </div>
            ) : null}

            <div className="flex-1 flex flex-col">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">In this room ({allInRoom.length})</h2>
              <div className="space-y-3 overflow-y-auto pr-2 scrollbar-clean">
                {allInRoom.map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <MemberProfilePopover user={u} side="left">
                      <div className={`h-8 w-8 rounded-full text-xs font-bold text-white flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-accent-primary transition-all overflow-hidden ${u.profilePictureUrl ? '' : u.avatarColor}`}>
                        {u.profilePictureUrl ? (
                          <img src={u.profilePictureUrl} alt={u.name} className="h-full w-full object-cover" />
                        ) : u.initials}
                      </div>
                    </MemberProfilePopover>
                    <div className="flex-1 min-w-0">
                      <MemberProfilePopover user={u} side="left">
                        <p className="text-sm font-bold truncate text-text-primary hover:underline cursor-pointer w-fit">{u.name}</p>
                      </MemberProfilePopover>
                      <p className="text-xs text-text-muted truncate">{u.status || "Demo participant"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (inWaitingRoom) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#071420] text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
          <ShieldCheck size={48} className="mx-auto text-emerald-400 mb-6" />
          <h2 className="text-2xl font-bold mb-3">Call Lobby</h2>
          <p className="text-sm text-slate-300 mb-8">This is a restricted room. Please wait, the meeting host will let you in soon.</p>
          <div className="flex items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
            <span className="text-sm font-bold text-emerald-400">Waiting for approval...</span>
          </div>
          <button onClick={() => {
             // Mock letting them in after 1s
             setInWaitingRoom(false);
          }} className="mt-8 px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-full">
            (Prototype: Skip Lobby)
          </button>
          <button onClick={endCall} className="mt-4 block mx-auto text-xs text-red-400 hover:text-red-300">
            Cancel and Leave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black text-white">
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-[11px] text-slate-400">{mode === "voice" ? "Group voice call" : "Group video call"} • {participants.length} participants • {formattedTime}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx(
            "rounded-full border px-3 py-1.5 text-xs font-bold flex items-center gap-2",
            callState === "secure-connected" || callState === "back-online"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/30 bg-amber-400/10 text-amber-200",
          )}>
            <Activity size={14} className={callState === "reconnecting" ? "animate-pulse" : ""} />
            {stateLabels[callState]}
          </div>
          <div className="relative group shrink-0 flex items-center pr-1 border-r border-white/10 mr-1">
            <select 
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value)}
              className="appearance-none bg-transparent py-1 pl-2 pr-6 text-xs font-bold text-slate-300 focus:outline-none hover:text-white cursor-pointer max-w-[110px] truncate"
              title="Select Transport Mode"
            >
              <option className="bg-black" value="Auto">Auto Call</option>
              <option className="bg-black" value="Internet">Internet</option>
              <option className="bg-black" value="Local Network">Local Network</option>
              <option className="bg-black" value="Radio Relay planned">Radio Voice (Planned)</option>
              <option className="bg-black" value="Cellular planned">Cellular (Planned)</option>
              <option className="bg-black" value="Satellite planned">Satellite (Planned)</option>
              <option className="bg-black" value="Mesh planned">Mesh (Planned)</option>
            </select>
            <Radio size={14} className="absolute right-1 text-slate-500 pointer-events-none" />
          </div>
          <button onClick={simulateReconnect} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15 flex items-center gap-2">
            <RotateCcw size={14} />
            Reconnect simulation
          </button>
        </div>
      </header>

      {transportMode.includes("planned") && (
        <div className="z-20 w-full bg-amber-900/30 px-4 py-1.5 text-center text-[11px] font-bold text-amber-500 backdrop-blur-sm border-b border-amber-900/50">
          This transport mode is planned and not active in the current prototype. Falling back to Internet/Local.
        </div>
      )}

      {mediaError && (
        <div className="z-20 w-full bg-red-900/50 px-4 py-2 flex items-center justify-center gap-3 backdrop-blur-sm border-b border-red-900">
          <span className="text-[11px] font-bold text-red-200">{mediaError}</span>
          <button onClick={() => setMediaRequested(true)} className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white text-[10px] rounded-lg font-bold">Retry Permission</button>
        </div>
      )}

      <div className="flex flex-1 flex-row overflow-hidden relative z-10 w-full">
        <div className="flex-1 flex flex-col relative h-full">
          <div className="absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[10px] font-bold text-slate-300 flex items-center gap-2">
            <ShieldCheck size={13} className="text-emerald-400" />
            Private prototype session
          </div>

          {deviceAlert && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 z-30 rounded-xl bg-amber-900/90 px-4 py-2 text-[11px] font-bold text-amber-200 border border-amber-500 shadow-2xl backdrop-blur-md">
              {deviceAlert}
            </div>
          )}

          <main className={clsx(
            "flex-1 overflow-y-auto scrollbar-clean p-4 pb-28 pt-16 flex flex-col lg:flex-row gap-4",
          )}>
            {focusedParticipantId && (
              <div className="flex-[3] flex items-center justify-center border-2 border-emerald-400 bg-slate-900 rounded-3xl relative overflow-hidden shadow-2xl min-h-[400px]">
                {screenStream && focusedParticipantId === "screenshare" ? (
                  <ScreenSharePreview stream={screenStream} className="absolute inset-0 h-full w-full object-contain bg-black" />
                ) : (
                  (() => {
                    const fp = participants.find(p => p.id === focusedParticipantId) || me;
                    return (
                      <>
                        <div className={`flex h-full w-full items-center justify-center ${fp.avatarColor}`}>
                          <span className="font-black text-white text-8xl">{fp.initials}</span>
                        </div>
                        {fp.id === me.id && mode === "video" && cameraOn && stream && (
                          <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover scale-x-[-1]" />
                        )}
                        <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1.5 text-sm font-bold rounded-xl text-white">
                          {fp.id === me.id ? "You" : fp.name}
                        </div>
                        <button onClick={() => setFocusedParticipantId(null)} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold">
                          Exit Focus
                        </button>
                      </>
                    );
                  })()
                )}
              </div>
            )}
            
            <div className={clsx(
              "flex-1",
              focusedParticipantId 
                ? "flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto" 
                : (mode === "video" || screenStream ? "grid content-center grid-cols-2 gap-3 lg:grid-cols-3 w-full" : "flex flex-wrap content-center justify-center gap-6 w-full")
            )}>
              {screenStream && focusedParticipantId !== "screenshare" && (
                <div onClick={() => setFocusedParticipantId("screenshare")} className="relative overflow-hidden border border-emerald-400 border-2 bg-slate-900 shadow-xl aspect-video rounded-2xl cursor-pointer">
                  <ScreenSharePreview
                    stream={screenStream}
                    className="absolute inset-0 h-full w-full object-contain bg-black rounded-2xl pointer-events-none"
                  />
                  <div className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white z-10">
                    Your Screen
                  </div>
                </div>
              )}
              {participants.map((participant, index) => {
                if (focusedParticipantId === participant.id) return null;
                const ownCameraOff = participant.id === me.id && (!cameraOn || mode === "voice");
                return (
                  <div
                    key={participant.id}
                    onClick={() => setFocusedParticipantId(participant.id)}
                    className={clsx(
                      "relative overflow-hidden border bg-slate-900 shadow-xl transition-colors duration-300 cursor-pointer shrink-0",
                      focusedParticipantId ? "w-48 aspect-video rounded-xl" : (mode === "video" ? "aspect-video rounded-2xl" : "h-44 w-44 rounded-full"),
                      lowBandwidth && index % 2 === 0 && "opacity-65 grayscale",
                      activeSpeakerId === participant.id ? "border-emerald-400 border-2" : "border-white/10"
                    )}
                  >
                    <div className={`flex h-full w-full items-center justify-center ${participant.avatarColor}`}>
                      <span className={clsx("font-black text-white", mode === "video" ? "text-5xl" : "text-4xl")}>{participant.initials}</span>
                    </div>
                    
                    {participant.id === me.id && mode === "video" && cameraOn && stream && (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 h-full w-full object-cover rounded-2xl scale-x-[-1]"
                      />
                    )}

                    <div className={clsx(
                      "absolute bg-black/70 px-2 py-1 text-[10px] font-bold",
                      mode === "video" ? "bottom-2 left-2 rounded-lg" : "bottom-3 left-1/2 -translate-x-1/2 rounded-full",
                    )}>
                      {participant.id === me.id ? "You" : participant.name}
                      {ownCameraOff ? " • audio" : ""}
                      {participant.id === me.id && muted ? " • muted" : ""}
                    </div>
                    {lowBandwidth && index % 2 === 0 && <span className="absolute right-2 top-2 rounded-lg bg-yellow-400/20 px-2 py-1 text-[9px] font-bold text-yellow-200">Low bandwidth</span>}
                  </div>
                );
              })}
            </div>
          </main>
      </div>

      {/* Device Panel Sidebar */}
      <div className={clsx(
        "w-80 shrink-0 border-l border-white/10 bg-black/60 backdrop-blur-lg flex flex-col p-4 transition-all overflow-y-auto scrollbar-clean h-full",
        devicePanelOpen ? "block" : "hidden"
      )}>
        <LocalMediaPanel isOpen={devicePanelOpen} onToggle={() => setDevicePanelOpen(!devicePanelOpen)} />
      </div>
    </div>

      <div className="absolute bottom-5 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 items-center justify-center gap-2 rounded-3xl border border-white/15 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl">
        <GroupControl active={devicePanelOpen} onClick={() => setDevicePanelOpen((value) => !value)} label="Devices" icon={<Settings2 size={20} />} />
        <GroupControl active={!muted} onClick={() => setMuted((value) => !value)} label={muted ? "Unmute" : "Mute"} icon={muted ? <MicOff size={20} /> : <Mic size={20} />} />
        <GroupControl active={cameraOn} onClick={() => setCameraOn((value) => !value)} label={cameraOn ? "Camera off" : "Camera on"} icon={cameraOn ? <Camera size={20} /> : <CameraOff size={20} />} />
        <GroupControl active={!!screenStream} onClick={toggleScreenShare} label={screenStream ? "Stop sharing" : "Share screen"} icon={screenStream ? <MonitorOff size={20} /> : <MonitorUp size={20} />} />
        <GroupControl 
          active={speakerOn} 
          onClick={() => {
            setSpeakerOn((value) => !value);
            setDeviceAlert("Speaker routing is mocked. Browser APIs don't natively allow choosing playback output without experimental flags.");
            setTimeout(() => setDeviceAlert(null), 5000);
          }} 
          label={speakerOn ? "Speaker on" : "Speaker off"} 
          icon={speakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />} 
        />
        <GroupControl active={lowBandwidth} onClick={() => { setLowBandwidth((value) => !value); if (!lowBandwidth) setCameraOn(false); }} label="Low bandwidth" icon={<Gauge size={20} />} />
        <button onClick={endCall} className="h-14 min-w-14 rounded-2xl bg-red-600 px-4 flex flex-col items-center justify-center hover:bg-red-500" title="End group call">
          <PhoneOff size={22} />
          <span className="mt-1 text-[9px] font-bold">Leave</span>
        </button>
      </div>
    </div>
  );
}

function GroupControl({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={active} className={clsx(
      "h-14 min-w-14 rounded-2xl border px-2 flex flex-col items-center justify-center",
      active ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300",
    )} title={label}>
      {icon}
      <span className="mt-1 max-w-16 truncate text-[8px] font-bold">{label}</span>
    </button>
  );
}
