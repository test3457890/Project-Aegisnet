import { Shield, ShieldAlert, Check } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";

interface NetworkWelcomeScreenProps {
  networkId: string;
}

export function NetworkWelcomeScreen({ networkId }: NetworkWelcomeScreenProps) {
  const { networks, acknowledgeWelcome, acknowledgeRules, me } = useMockAppState();
  const network = networks[networkId];

  if (!network) return null;

  const handleAcknowledge = () => {
    acknowledgeWelcome(networkId);
    acknowledgeRules(networkId);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background-primary p-4 pb-20 md:pb-4 lg:p-8 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-border-default bg-surface-card shadow-xl overflow-hidden my-auto">
        <div className="bg-accent-primary/10 p-6 sm:p-8 text-center border-b border-border-default">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary text-white text-2xl font-black">
            {network.initials}
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome to {network.name}</h1>
          <p className="mt-2 text-text-secondary">Please review the rules and purpose of this network before entering.</p>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
              <Shield size={16} className="text-accent-primary" />
              Network Purpose
            </h2>
            <div className="rounded-xl border border-border-default bg-background-secondary p-4">
              <p className="text-sm text-text-primary leading-relaxed">
                This is a secure space for team communication, coordination, and file sharing. 
                All members are expected to maintain confidentiality and operational security.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
              <ShieldAlert size={16} className="text-warning" />
              Prototype Warning
            </h2>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-text-primary leading-relaxed font-semibold">
                This environment is a local prototype. Do not share real sensitive data, passwords, or PII. 
                Data is stored locally in your browser and is not truly end-to-end encrypted.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4">Rules</h2>
            <ul className="space-y-3">
              {[
                "Treat all members with respect.",
                "Do not leak information outside of this network.",
                "Report any security concerns to the network owner immediately."
              ].map((rule, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-text-primary">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background-secondary text-xs font-bold text-text-secondary">
                    {idx + 1}
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="border-t border-border-default bg-background-secondary p-6 flex justify-end">
          <button
            onClick={handleAcknowledge}
            className="flex items-center gap-2 rounded-xl bg-accent-primary px-6 py-3 text-sm font-bold text-white hover:bg-accent-secondary transition-colors"
          >
            I Acknowledge <Check size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
