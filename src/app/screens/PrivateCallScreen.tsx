import {
  Activity, Camera, CameraOff, Gauge, Mic, MicOff,
  PhoneOff, RotateCcw, ShieldCheck, Volume2, VolumeX, MonitorUp, MonitorOff, Settings2, Radio
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { clsx } from "clsx";
import { CallState, useMockAppState } from "../state/mockAppState";
import { LocalMediaPanel } from "../components/calls/LocalMediaPanel";
import { ScreenSharePreview } from "../components/calls/ScreenSharePreview";
import { logQaEvent } from "../qa/qaEvents";

const callStateLabels: Record<CallState, string> = {
  "ringing": "Ringing...",
  "incoming": "Incoming call",
  "missed": "Missed call",
  "declined": "Call declined",
  "ended": "Call ended",
  "secure-connected": "Good",
  "weak-signal": "Unstable",
  "reconnecting": "Reconnecting",
  "restoring-audio": "Unstable",
  "restoring-video": "Unstable",
  "audio-fallback": "Unstable",
  "text-fallback": "Disconnected",
  "back-online": "Good",
};

export function PrivateCallScreen() {
  const { chatId, callType, callId } = useParams();
  const resolvedChatId = chatId || callId || "chat_sarah";
  const mode = callType === "video" ? "video" : "voice";
  const { chatList, users, me, callState, setCallState, startPrototypeCall, endPrototypeCall, trustedContacts, preferences, updatePreference } = useMockAppState();
  const navigate = useNavigate();
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(mode === "video");
  const [speakerOn, setSpeakerOn] = useState(true);
  const lowBandwidth = preferences.lowBandwidthMode;
  const setLowBandwidth = (val: boolean) => updatePreference("lowBandwidthMode", val);
  const [deviceAlert, setDeviceAlert] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [transportMode, setTransportMode] = useState("Auto");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [devicePanelOpen, setDevicePanelOpen] = useState(false);

  const chat = chatList[resolvedChatId];
  const otherId = chat?.participants.find((participantId) => participantId !== me.id);
  const otherUser = otherId ? users[otherId] : users.user_sarah;

  const [hasStarted, setHasStarted] = useState(false);
  const [isIncoming] = useState(() => new URLSearchParams(window.location.search).get("incoming") === "true");

  useEffect(() => {
    if (isIncoming && !hasStarted) {
      setCallState("incoming");
    } else if (!hasStarted) {
      setCallState("ringing");
      // mock auto-answer after 3s if calling out
      const t = setTimeout(() => {
        setCallState("secure-connected");
        setHasStarted(true);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [isIncoming, hasStarted, setCallState]);

  useEffect(() => {
    if (hasStarted) {
      startPrototypeCall({ mode, chatId: resolvedChatId, receiverId: otherId });
      const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
      return () => {
        window.clearInterval(timer);
        timers.current.forEach(window.clearTimeout);
        endPrototypeCall();
      };
    }
  }, [hasStarted, endPrototypeCall, mode, otherId, resolvedChatId, startPrototypeCall]);

  const requestMedia = () => {
    if (!hasStarted) return () => {};
    setMediaError(null);
    let activeStream: MediaStream | null = null;
    if (mode === "video") {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then(s => {
          activeStream = s;
          setStream(s);
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
    const cleanup = requestMedia();
    return cleanup;
  }, [mode]);

  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = cameraOn);
    }
  }, [cameraOn, stream]);

  useEffect(() => {
    if (localVideoRef.current && stream) {
      if (localVideoRef.current.srcObject !== stream) {
        localVideoRef.current.srcObject = stream;
      }
    }
  }, [stream, cameraOn]); // run when stream changes, or cameraOn changes mounting the video element

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

  const scheduleState = (state: CallState, delay: number) => {
    timers.current.push(window.setTimeout(() => setCallState(state), delay));
  };

  const simulateReconnect = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setCallState("weak-signal");
    scheduleState("reconnecting", 900);
    scheduleState("restoring-audio", 1800);
    scheduleState("restoring-video", 2700);
    scheduleState("audio-fallback", 3600);
    scheduleState("text-fallback", 4500);
    scheduleState("back-online", 5400);
    scheduleState("secure-connected", 6500);
  };

  const endCall = () => {
    endPrototypeCall();
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
    }
    navigate(`/app/private/dm/${resolvedChatId}`);
  };

  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      logQaEvent({ type: "screenshare.stopped", userId: me.id, success: true });
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(s);
      logQaEvent({ type: "screenshare.started", userId: me.id, success: true });
      // Browser "Stop sharing" bar or the OS ending the capture.
      s.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        logQaEvent({ type: "screenshare.track.ended", userId: me.id, success: true });
      };
    } catch (err) {
      console.error("Screen share error", err);
      setMediaError("Screen share canceled or not permitted.");
      logQaEvent({ type: "screenshare.failed", userId: me.id, success: false, reason: "canceled-or-denied" });
    }
  };

  // Stop screen capture if the user navigates away while still sharing.
  useEffect(() => {
    if (!screenStream) return;
    return () => {
      screenStream.getTracks().forEach(t => t.stop());
    };
  }, [screenStream]);

  const formattedTime = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const otherUserTrust = otherUser ? trustedContacts[otherUser.id] : undefined;
  const isTrusted = otherUserTrust?.level === "Trusted" || otherUserTrust?.level === "Verified";
  const isUntrusted = !otherUserTrust || otherUserTrust.level === "None" || otherUserTrust.level === "Known";

  useEffect(() => {
    if (callState !== "reconnecting" && callState !== "secure-connected") {
      logQaEvent({ type: "call.connection_state_changed", state: callState, userId: me.id });
    }
  }, [callState, me.id]);

  useEffect(() => {
    logQaEvent({ type: "call.started", mode, targetId: otherUser?.id, userId: me.id });
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#071420] text-white">
      <div className={`absolute inset-0 opacity-20 blur-3xl ${otherUser?.avatarColor || "bg-accent-primary"}`} />
      <div className="absolute inset-0 bg-[#071420]/85" />

      <header className="relative z-10 flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">{mode === "video" ? "One-to-one video call" : "One-to-one voice call"}</p>
          <div className="mt-2 flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs">
            <ShieldCheck size={14} className="text-emerald-400" />
            Private prototype session
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
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
            <RotateCcw size={15} />
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
          <button onClick={requestMedia} className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white text-[10px] rounded-lg font-bold">Retry Permission</button>
        </div>
      )}

      <div className="flex flex-1 flex-row overflow-hidden relative z-10 w-full">
        <main className="flex flex-1 flex-col items-center justify-center px-5 pb-32 text-center w-full gap-4 md:flex-row overflow-y-auto scrollbar-clean">
        {screenStream && (
          <div className="relative flex-1 flex items-center justify-center overflow-hidden border-2 border-emerald-400 bg-slate-900 shadow-2xl rounded-3xl w-full aspect-video">
            <ScreenSharePreview
              stream={screenStream}
              className="absolute inset-0 h-full w-full object-contain bg-black"
            />
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold z-10">
              Your Screen (Local Prototype - Not sent to others)
            </div>
          </div>
        )}
        <div className="flex flex-col items-center flex-1 w-full max-w-md">
          <div className={clsx(
            "relative flex items-center justify-center overflow-hidden border-4 shadow-2xl transition-all",
            cameraOn ? "h-64 w-full rounded-3xl border-cyan-400/60 bg-slate-900" : "h-52 w-52 rounded-full border-cyan-400/60",
            lowBandwidth && "opacity-70 grayscale",
            !cameraOn && (otherUser?.avatarColor || "bg-accent-primary"),
          )}>
            {(!cameraOn || !stream || !hasStarted) && <span className={clsx("font-black text-white", cameraOn ? "text-8xl" : "text-6xl")}>{otherUser?.initials || "PM"}</span>}
          {cameraOn && stream && hasStarted && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
            />
          )}
          {cameraOn && hasStarted && <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold z-10">Local video preview</span>}
        </div>

        <h1 className="mt-6 text-3xl font-bold">{otherUser?.name || chat?.name || "Private contact"}</h1>
        {hasStarted && <p className="mt-2 font-mono text-sm text-slate-300">{formattedTime}</p>}
        
        <div className={clsx(
          "mt-4 rounded-full border px-4 py-2 text-sm font-bold flex items-center gap-2",
          callState === "secure-connected" || callState === "back-online"
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            : (["missed", "declined", "ended"].includes(callState) ? "border-red-400/30 bg-red-400/10 text-red-300" : "border-amber-400/30 bg-amber-400/10 text-amber-200"),
        )}>
          {["ringing", "reconnecting", "incoming"].includes(callState) && <Activity size={15} className="animate-pulse" />}
          {callStateLabels[callState]}
        </div>

        {deviceAlert && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-xl bg-amber-900/90 px-4 py-2 text-[11px] font-bold text-amber-200 border border-amber-500 shadow-2xl backdrop-blur-md">
            {deviceAlert}
          </div>
        )}

          {lowBandwidth && <p className="mt-3 rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-200">Low-bandwidth mode active</p>}

          {isUntrusted && (
            <div className="mt-4 max-w-sm rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold text-amber-500 flex items-center justify-center gap-2">
                <ShieldCheck size={14} />
                Untrusted Contact
              </p>
              <p className="mt-1 text-[11px] text-amber-200/80">
                You are calling someone who is not fully trusted. This is a prototype security warning.
              </p>
            </div>
          )}
          {isTrusted && (
            <div className="mt-3 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <ShieldCheck size={12} />
              Trusted
            </div>
          )}

        </div>
        </main>
        
        {/* Device Panel Sidebar */}
        <div className={clsx(
          "w-80 shrink-0 border-l border-white/10 bg-black/60 backdrop-blur-lg flex flex-col p-4 transition-all overflow-y-auto scrollbar-clean h-full",
          devicePanelOpen ? "block" : "hidden"
        )}>
          <LocalMediaPanel isOpen={devicePanelOpen} onToggle={() => setDevicePanelOpen(!devicePanelOpen)} />
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 items-center justify-center gap-2 rounded-3xl border border-white/15 bg-slate-950/80 p-3 shadow-2xl backdrop-blur-xl sm:gap-3">
        {callState === "incoming" ? (
          <div className="flex items-center gap-6">
            <button onClick={() => { setCallState("secure-connected"); setHasStarted(true); }} className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse" title="Accept call">
              <Mic size={28} className="text-white" />
            </button>
            <button onClick={() => { setCallState("declined"); setTimeout(endCall, 2000); }} className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 transition-colors shadow-lg" title="Decline call">
              <PhoneOff size={28} className="text-white" />
            </button>
          </div>
        ) : (["ended", "declined", "missed"].includes(callState) ? (
          <div className="flex items-center gap-4">
            <button onClick={endCall} className="flex h-14 items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 px-6 font-bold transition-colors shadow-lg" title="Close">
              Close
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <CallControl active={devicePanelOpen} onClick={() => setDevicePanelOpen((value) => !value)} label="Devices" icon={<Settings2 size={24} />} />
            <CallControl active={!muted} onClick={() => setMuted((value) => !value)} label={muted ? "Unmute" : "Mute"} icon={muted ? <MicOff size={24} /> : <Mic size={24} />} />
            <CallControl active={cameraOn} onClick={() => setCameraOn((value) => !value)} label={cameraOn ? "Camera off" : "Camera on"} icon={cameraOn ? <Camera size={24} /> : <CameraOff size={24} />} />
            <CallControl active={!!screenStream} onClick={toggleScreenShare} label={screenStream ? "Stop sharing" : "Share screen"} icon={screenStream ? <MonitorOff size={24} /> : <MonitorUp size={24} />} />
            <CallControl 
              active={speakerOn} 
              onClick={() => {
                setSpeakerOn((value) => !value);
                setDeviceAlert("Speaker routing is mocked. Browser APIs don't natively allow choosing playback output without experimental flags.");
                setTimeout(() => setDeviceAlert(null), 5000);
              }} 
              label={speakerOn ? "Speaker on" : "Speaker off"} 
              icon={speakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />} 
            />
            <CallControl active={lowBandwidth} onClick={() => { setLowBandwidth(!lowBandwidth); if (!lowBandwidth) setCameraOn(false); }} label="Low BW" icon={<Gauge size={24} />} />
            <button onClick={() => { setCallState("ended"); setTimeout(endCall, 1500); }} className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 transition-colors shadow-lg" title="End call">
              <PhoneOff size={28} className="text-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CallControl({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={clsx(
        "h-14 min-w-14 rounded-2xl border px-2 flex flex-col items-center justify-center transition-colors",
        active ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300",
      )}
      title={label}
    >
      {icon}
      <span className="mt-1 max-w-16 truncate text-[8px] font-bold">{label}</span>
    </button>
  );
}
