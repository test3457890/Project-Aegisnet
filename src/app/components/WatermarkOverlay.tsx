import { useMockAppState } from "../state/mockAppState";

export function WatermarkOverlay() {
  const { preferences, me } = useMockAppState();

  if (!preferences.watermarkEnabled) {
    return null;
  }

  // A repeated pattern of the user's name
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden opacity-[0.03] select-none">
      <div className="absolute -inset-x-full -inset-y-full flex rotate-[-30deg] flex-wrap items-center justify-center gap-10 whitespace-nowrap">
        {Array.from({ length: 400 }).map((_, i) => (
          <span key={i} className="text-2xl font-bold uppercase tracking-widest text-text-primary">
            {me.name} • {me.id}
          </span>
        ))}
      </div>
    </div>
  );
}
