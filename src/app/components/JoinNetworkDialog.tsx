import { ScanLine } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useMockAppState } from "../state/mockAppState";

export function JoinNetworkDialog() {
  const { acceptInvitation, invitations } = useMockAppState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"code" | "questions">("code");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setError("Please enter an invitation code.");
      return;
    }
    if (step === "code") {
      const inviteCode = code.trim();
      const localInvite = invitations.find(i => i.code.toLowerCase() === inviteCode.toLowerCase());
      
      if (localInvite?.onboardingQuestions?.length) {
        setQuestions(localInvite.onboardingQuestions);
        setAnswers({});
        setStep("questions");
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      const targetId = await acceptInvitation(code.trim(), step === "questions" ? answers : undefined);
      if (targetId) {
        setCode("");
        setStep("code");
        setQuestions([]);
        setAnswers({});
        setOpen(false);
        // Local group invitation codes resolve to a private group chat.
        navigate(targetId.startsWith("chat") ? `/app/private/group/${targetId}` : `/app/network/${targetId}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to join network. Invalid code or already used.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="h-12 w-12 rounded-2xl border border-transparent bg-background-secondary text-accent-primary flex items-center justify-center hover:rounded-xl hover:bg-accent-primary hover:text-white mt-1"
          title="Join Network"
          aria-label="Join Network"
        >
          <ScanLine size={23} />
        </button>
      </DialogTrigger>
      <DialogContent className="border-border-default bg-surface-card text-text-primary sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Join a Network</DialogTitle>
          <DialogDescription className="text-text-secondary">
            Enter an invitation code to join an existing Network or private group.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === "code" ? (
            <label className="block space-y-2">
              <span className="text-sm font-bold">Invitation Code</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="e.g. 5x8a..."
                autoFocus
                disabled={loading}
                className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 disabled:opacity-50"
              />
            </label>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-bold text-text-primary mb-2">Onboarding Questions</p>
              {questions.map((q, i) => (
                <label key={i} className="block space-y-2">
                  <span className="text-sm font-semibold text-text-muted">{q}</span>
                  <textarea
                    value={answers[q] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                    placeholder="Your answer..."
                    disabled={loading}
                    className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 resize-none disabled:opacity-50"
                    rows={2}
                    required
                  />
                </label>
              ))}
            </div>
          )}
          {error && <p role="alert" className="text-sm text-danger-readable">{error}</p>}
          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => {
                if (step === "questions") {
                  setStep("code");
                  setError("");
                } else {
                  setOpen(false);
                }
              }} 
              disabled={loading} 
              className="rounded-xl border border-border-default px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-hover disabled:opacity-50"
            >
              {step === "questions" ? "Back" : "Cancel"}
            </button>
            <button type="submit" disabled={loading} className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-secondary disabled:opacity-50">
              {loading ? "Joining..." : step === "questions" ? "Submit & Join" : "Next"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
