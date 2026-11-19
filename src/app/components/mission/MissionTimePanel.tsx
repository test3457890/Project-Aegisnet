import { useEffect, useState } from "react";
import { Clock, Globe } from "lucide-react";
import { useMissionState } from "../../state/missionState";

interface MissionTimePanelProps {
  missionId: string;
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC"
];

function formatTime(date: Date, timeZone: string, useZulu: boolean) {
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: useZulu ? "UTC" : timeZone,
  };
  return new Intl.DateTimeFormat("en-US", options).format(date) + (useZulu ? " Z" : "");
}

function getTimeDifference(targetTime: string | undefined): string {
  if (!targetTime) return "--:--";
  const target = new Date(targetTime).getTime();
  const now = Date.now();
  const diff = Math.abs(target - now);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const prefix = target > now ? "T-" : "T+";
  return `${prefix}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function MissionTimePanel({ missionId }: MissionTimePanelProps) {
  const { missions } = useMissionState();
  const mission = missions[missionId];
  
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [useZulu, setUseZulu] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mission) return null;

  const startTime = mission.briefing?.startTime;
  const expectedEndTime = mission.briefing?.expectedEndTime;

  return (
    <div className="rounded-xl border border-border-default bg-surface-card p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border-default pb-3">
        <h2 className="text-sm font-bold flex items-center gap-2 text-text-primary">
          <Clock size={16} /> Mission Chronometer
        </h2>
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-text-secondary" />
          <select
            aria-label="Time zone"
            className="text-xs border border-border-default bg-background-secondary rounded p-1 text-text-primary focus:outline-none focus:border-accent-primary"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            disabled={useZulu}
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-text-primary ml-2">
            <input 
              type="checkbox" 
              checked={useZulu} 
              onChange={(e) => setUseZulu(e.target.checked)} 
              className="rounded border-border-default text-accent-primary focus:ring-accent-primary bg-background-primary"
            />
            UTC/Zulu
          </label>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-lg bg-background-secondary border border-border-default">
          <p className="text-xs text-text-secondary mb-1">Current Time</p>
          <p className="text-xl font-mono font-bold text-text-primary">{formatTime(now, timeZone, useZulu)}</p>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-background-secondary border border-border-default">
          <p className="text-xs text-text-secondary mb-1">Start T-Time</p>
          <p className="text-xl font-mono font-bold text-text-primary">
            {getTimeDifference(startTime)}
          </p>
          {startTime && <p className="text-[10px] text-text-muted mt-1">{new Date(startTime).toLocaleDateString()}</p>}
        </div>

        <div className="text-center p-3 rounded-lg bg-background-secondary border border-border-default">
          <p className="text-xs text-text-secondary mb-1">End T-Time</p>
          <p className="text-xl font-mono font-bold text-text-primary">
            {getTimeDifference(expectedEndTime)}
          </p>
          {expectedEndTime && <p className="text-[10px] text-text-muted mt-1">{new Date(expectedEndTime).toLocaleDateString()}</p>}
        </div>
      </div>

      <div className="mt-2 text-[11px] text-text-muted italic flex items-center justify-center">
        All mission timestamps are shown in {useZulu ? "UTC" : timeZone}.
      </div>
    </div>
  );
}
