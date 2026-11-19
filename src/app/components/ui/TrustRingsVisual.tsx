import React, { useEffect } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { logQaEvent } from "../../qa/qaEvents";

export function TrustRingsVisual({
  userId,
  innerRingCount,
  outerRingCount,
}: {
  userId: string;
  innerRingCount: number;
  outerRingCount: number;
}) {
  useEffect(() => {
    logQaEvent({ type: "trust_ring.viewed", userId });
  }, [userId]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-surface-card rounded-2xl border border-border-default">
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-[6px] border-success/30 flex items-center justify-center">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-card px-2 text-xs font-bold text-success border border-success/30 rounded-full">
            Outer Ring ({outerRingCount})
          </div>
        </div>
        
        {/* Inner Ring */}
        <div className="absolute inset-8 rounded-full border-[6px] border-blue-500/40 flex items-center justify-center bg-blue-500/5">
          <div className="absolute top-1 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-card px-2 text-xs font-bold text-blue-500 border border-blue-500/40 rounded-full">
            Inner ({innerRingCount})
          </div>
        </div>

        {/* Center */}
        <div className="relative z-10 w-12 h-12 bg-background-primary rounded-full border-4 border-border-default flex items-center justify-center shadow-lg">
          <span className="text-[10px] font-black text-text-primary">YOU</span>
        </div>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20 p-4 w-full">
        <ShieldAlert className="text-accent-readable shrink-0 mt-0.5" size={18} />
        <div className="text-sm">
          <p className="font-semibold text-accent-readable">Local prototype only.</p>
          <p className="text-accent-readable/80 mt-1">Does not perform real device or cryptographic identity verification. The Green/Blue ring system is a planned UI concept.</p>
        </div>
      </div>
    </div>
  );
}
