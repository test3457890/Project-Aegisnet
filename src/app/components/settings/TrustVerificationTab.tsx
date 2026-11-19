import { ShieldCheck, QrCode, Lock, AlertTriangle } from "lucide-react";
import { TrustRingIcon, PrototypeBadge, PlannedBadge, TrustedContactBadge, KnownContactBadge } from "../ui/Badges";

export function TrustVerificationTab() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">Trust Verification Center</h2>
        <p className="text-sm text-text-muted mb-4">View your trust relationships and identity verifications.</p>

        <div className="mb-6 rounded-lg border border-amber-900/30 bg-amber-900/10 px-4 py-3">
          <p className="text-sm font-medium text-amber-500">
            <AlertTriangle size={16} className="inline mr-2" />
            Trust labels are prototype labels. They are not cryptographic identity verification. Known Contact and Trusted Contact should never imply legal identity, age, employment status, device ownership, clearance, organization membership, or background check status.
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="rounded-lg border border-border-default bg-background-secondary p-4">
            <h3 className="font-medium text-text-primary mb-4">Understanding Trust Rings</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <TrustRingIcon level="green" />
                <span className="text-sm text-text-secondary"><strong className="text-text-primary">Green:</strong> Organization verified <PlannedBadge /></span>
              </div>
              <div className="flex items-center gap-3">
                <TrustRingIcon level="blue" />
                <span className="text-sm text-text-secondary"><strong className="text-text-primary">Blue:</strong> Trusted partner <PlannedBadge /></span>
              </div>
              <div className="flex items-center gap-3">
                <TrustRingIcon level="amber" />
                <span className="text-sm text-text-secondary"><strong className="text-text-primary">Amber:</strong> Known Contact or manually trusted <PrototypeBadge /></span>
              </div>
              <div className="flex items-center gap-3">
                <TrustRingIcon level="red" />
                <span className="text-sm text-text-secondary"><strong className="text-text-primary">Red:</strong> Untrusted or high risk <PrototypeBadge /></span>
              </div>
              <div className="flex items-center gap-3">
                <TrustRingIcon level="gray" />
                <span className="text-sm text-text-secondary"><strong className="text-text-primary">Gray:</strong> Guest or temporary participant <PrototypeBadge /></span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border-default bg-background-secondary p-4">
            <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-accent-primary" /> Cryptographic Verification
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl border border-border-default bg-background-primary">
                <div>
                  <div className="flex items-center gap-2">
                    <QrCode size={18} className="text-text-secondary" />
                    <span className="font-bold text-text-primary text-sm">QR Verification</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">Scan a contact's device to verify their identity out-of-band.</p>
                </div>
                <div><PlannedBadge /></div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl border border-border-default bg-background-primary">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock size={18} className="text-text-secondary" />
                    <span className="font-bold text-text-primary text-sm">Safety Numbers</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">Compare safety numbers to ensure E2EE is not compromised.</p>
                </div>
                <div><PlannedBadge /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
