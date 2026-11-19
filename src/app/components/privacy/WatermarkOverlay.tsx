import { useMockAppState } from "../../state/mockAppState";

/**
 * Renders a full-screen, pointer-events-none overlay that repeats the user's name
 * as a faint watermark to act as an honest screenshot deterrent.
 */
export function WatermarkOverlay() {
  const { me, preferences } = useMockAppState();

  if (!preferences.watermarkEnabled) {
    return null;
  }

  const watermarkText = `${me.name} / ${me.id}`;

  return (
    <div 
      className="fixed inset-0 z-[200] pointer-events-none overflow-hidden" 
      aria-hidden="true"
    >
      <div 
        className="absolute inset-[-100%] flex flex-wrap opacity-[0.03] rotate-[-30deg]"
        style={{ width: "300%", height: "300%" }}
      >
        {Array.from({ length: 400 }).map((_, i) => (
          <div 
            key={i} 
            className="text-text-primary font-bold text-2xl p-12 select-none whitespace-nowrap"
          >
            {watermarkText}
          </div>
        ))}
      </div>
    </div>
  );
}
