import { Camera, CameraOff, ChevronDown, Mic2, RefreshCw, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DeviceOption {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
}

const DEVICE_KEYS = {
  video: "aegisnet_media_videoDeviceId",
  audio: "aegisnet_media_audioDeviceId",
  output: "aegisnet_media_outputDeviceId",
};

function loadDevicePreference(key: string) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function permissionErrorMessage(error: unknown, device: "camera" | "microphone") {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return `${device === "camera" ? "Camera" : "Microphone"} permission is blocked. Use the browser site controls to allow it, then try again.`;
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return `No ${device} was found. Connect one or choose another device.`;
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return `The ${device} is busy or unavailable to this browser. Close other apps using it and try again.`;
  }
  return `The ${device} could not start. Check the selected device and browser permissions.`;
}

export function LocalMediaPanel({ 
  isOpen, 
  onToggle 
}: { 
  isOpen?: boolean; 
  onToggle?: () => void; 
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const toggleOpen = () => {
    if (onToggle) onToggle();
    else setInternalOpen(v => !v);
  };
  const [status, setStatus] = useState("Camera permission has not been requested.");
  const [previewOn, setPreviewOn] = useState(false);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [videoDeviceId, setVideoDeviceId] = useState(() => loadDevicePreference(DEVICE_KEYS.video));
  const [audioDeviceId, setAudioDeviceId] = useState(() => loadDevicePreference(DEVICE_KEYS.audio));
  const [outputDeviceId, setOutputDeviceId] = useState(() => loadDevicePreference(DEVICE_KEYS.output));
  const [meterOn, setMeterOn] = useState(false);
  const [meterLevel, setMeterLevel] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const meterStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterFrameRef = useRef<number | null>(null);

  const stopPreview = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPreviewOn(false);
    setStatus("Local camera preview stopped.");
  };

  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setStatus("Device selection is not available in this browser.");
      return;
    }
    try {
      const available = await navigator.mediaDevices.enumerateDevices();
      const nextDevices = available
        .filter((device) => ["videoinput", "audioinput", "audiooutput"].includes(device.kind))
        .map((device, index) => ({
          deviceId: device.deviceId,
          kind: device.kind,
          label: device.label || `${device.kind === "videoinput" ? "Camera" : device.kind === "audioinput" ? "Microphone" : "Speaker"} ${index + 1}`,
        }));
      setDevices(nextDevices);

      const missing: string[] = [];
      if (videoDeviceId && !nextDevices.some((device) => device.kind === "videoinput" && device.deviceId === videoDeviceId)) {
        setVideoDeviceId("");
        localStorage.removeItem(DEVICE_KEYS.video);
        missing.push("camera");
      }
      if (audioDeviceId && !nextDevices.some((device) => device.kind === "audioinput" && device.deviceId === audioDeviceId)) {
        setAudioDeviceId("");
        localStorage.removeItem(DEVICE_KEYS.audio);
        missing.push("microphone");
      }
      if (outputDeviceId && !nextDevices.some((device) => device.kind === "audiooutput" && device.deviceId === outputDeviceId)) {
        setOutputDeviceId("");
        localStorage.removeItem(DEVICE_KEYS.output);
        missing.push("speaker");
      }
      if (missing.length) setStatus(`The saved ${missing.join(", ")} preference is unavailable, so the default device will be used.`);
    } catch {
      setStatus("Device names are unavailable until browser permission is granted.");
    }
  };

  const startPreview = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Local camera preview is not supported in this browser.");
      return;
    }

    stopPreview();
    setStatus("Waiting for browser camera permission...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setPreviewOn(true);
      setStatus("Local preview active. Nothing is sent to another participant.");
      await refreshDevices();
    } catch (error) {
      setStatus(permissionErrorMessage(error, "camera"));
    }
  };

  const changeVideo = (deviceId: string) => {
    setVideoDeviceId(deviceId);
    if (deviceId) localStorage.setItem(DEVICE_KEYS.video, deviceId);
    else localStorage.removeItem(DEVICE_KEYS.video);
  };

  const changeAudio = (deviceId: string) => {
    stopMeter();
    setAudioDeviceId(deviceId);
    if (deviceId) localStorage.setItem(DEVICE_KEYS.audio, deviceId);
    else localStorage.removeItem(DEVICE_KEYS.audio);
  };

  const changeOutput = async (deviceId: string) => {
    setOutputDeviceId(deviceId);
    if (deviceId) localStorage.setItem(DEVICE_KEYS.output, deviceId);
    else localStorage.removeItem(DEVICE_KEYS.output);
    const mediaElement = videoRef.current as HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> };
    if (deviceId && mediaElement?.setSinkId) {
      await mediaElement.setSinkId(deviceId).catch(() => {
        setStatus("The selected speaker could not be applied in this browser.");
      });
    }
  };

  const stopMeter = () => {
    if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current);
    meterFrameRef.current = null;
    meterStreamRef.current?.getTracks().forEach((track) => track.stop());
    meterStreamRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    setMeterOn(false);
    setMeterLevel(0);
  };

  const startMeter = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Microphone level preview is not supported in this browser.");
      return;
    }
    stopMeter();
    setStatus("Waiting for browser microphone permission...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      });
      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) throw new Error("Audio analysis unavailable");
      const context = new AudioContextConstructor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const values = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        analyser.getByteFrequencyData(values);
        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        setMeterLevel(Math.min(100, Math.round((average / 128) * 100)));
        meterFrameRef.current = requestAnimationFrame(update);
      };
      meterStreamRef.current = stream;
      audioContextRef.current = context;
      setMeterOn(true);
      setStatus("Local microphone level active. Audio is analysed in memory and is not recorded.");
      update();
      await refreshDevices();
    } catch (error) {
      stopMeter();
      setStatus(permissionErrorMessage(error, "microphone"));
    }
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current);
    meterStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close().catch(() => undefined);
  }, []);

  const cameras = devices.filter((device) => device.kind === "videoinput");
  const microphones = devices.filter((device) => device.kind === "audioinput");
  const speakers = devices.filter((device) => device.kind === "audiooutput");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          toggleOpen();
          if (!open) refreshDevices();
        }}
        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15 flex items-center gap-2"
        aria-expanded={open}
      >
        <Settings2 size={15} />
        {open ? "Hide device preview" : "Show device preview"}
      </button>

      {open && (
        <section className="mt-2 w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950 p-4 text-left shadow-2xl flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white">Local device preview</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Permission is requested only when you enable preview. This stays on this device and is not a remote call feed.
              </p>
            </div>
            <button type="button" onClick={refreshDevices} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Refresh device list">
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="mt-4 aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className={previewOn ? "h-full w-full object-cover" : "hidden"}
              aria-label="Local camera preview"
            />
            {!previewOn && (
              <div className="flex h-full items-center justify-center text-slate-500">
                <CameraOff size={28} />
              </div>
            )}
          </div>

          <p role="status" className="mt-2 min-h-8 text-[11px] leading-relaxed text-cyan-200">{status}</p>

          <div className="mt-3 space-y-3">
            <DeviceSelect label="Camera" value={videoDeviceId} onChange={changeVideo} options={cameras} fallback="Default camera" />
            <DeviceSelect label="Microphone" value={audioDeviceId} onChange={changeAudio} options={microphones} fallback="Default microphone" />
            <DeviceSelect label="Speaker" value={outputDeviceId} onChange={changeOutput} options={speakers} fallback="Default speaker" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={startPreview} className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 flex items-center justify-center gap-2">
              <Camera size={15} />
              Enable preview
            </button>
            <button type="button" onClick={stopPreview} disabled={!previewOn} className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
              Stop preview
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-slate-900 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-white">Microphone level</p>
                <p className="text-[10px] text-slate-400">Local analysis only. No recording.</p>
              </div>
              <button type="button" onClick={meterOn ? stopMeter : startMeter} className="rounded-lg border border-white/15 px-3 py-2 text-[10px] font-bold text-white hover:bg-white/10 flex items-center gap-1.5">
                <Mic2 size={13} />
                {meterOn ? "Stop meter" : "Enable meter"}
              </button>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={meterLevel}>
              <div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${meterLevel}%` }} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function DeviceSelect({
  label,
  value,
  onChange,
  options,
  fallback,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void | Promise<void>;
  options: DeviceOption[];
  fallback: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
      >
        <option value="">{fallback}</option>
        {options.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
      </select>
    </label>
  );
}
