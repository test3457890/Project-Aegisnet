import { Plus, ArrowRight, Check, Shield, Globe, Lock, Info, Users, Map, Briefcase, GraduationCap, Terminal, Home } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { clsx } from "clsx";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "./ui/dialog";
import { useMockAppState } from "../state/mockAppState";
import { logQaEvent } from "../qa/qaEvents";
import { networkTemplates } from "../data/networkTemplates";

const IconMap: Record<string, React.ElementType> = {
  Home,
  GraduationCap,
  Terminal,
  Map,
  Briefcase,
  Plus
};

export function CreateNetworkDialog() {
  const { createNetwork } = useMockAppState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState("blank");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("private");
  const [error, setError] = useState("");

  const selectedTemplate = networkTemplates.find(t => t.id === templateId) || networkTemplates.find(t => t.id === "blank") || networkTemplates[0];

  const handleNext = () => {
    if (step === 1 && !templateId) {
      setError("Please select a template.");
      return;
    }
    if (step === 2 && !name.trim()) {
      setError("Please give your Network a name.");
      return;
    }
    setError("");
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setStep(1);
      setName("");
      setDescription("");
      setTemplateId("blank");
      setError("");
    } else {
      logQaEvent({ type: "network.creation.started" });
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give the Network a name.");
      return;
    }
    const { networkId, roomId } = createNetwork(name, templateId);
    logQaEvent({ type: "network.creation.completed", networkId, templateId });
    setName("");
    setDescription("");
    setError("");
    setStep(1);
    setOpen(false);
    navigate(`/app/network/${networkId}/room/${roomId}`);
  };

  const selectTemplate = (id: string) => {
    setTemplateId(id);
    logQaEvent({ type: "network.template.selected", templateId: id });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="h-12 w-12 rounded-2xl border border-transparent bg-background-secondary text-success flex items-center justify-center hover:rounded-xl hover:bg-success hover:text-white"
          title="Create Network"
          aria-label="Create Network"
        >
          <Plus size={23} />
        </button>
      </DialogTrigger>
      <DialogContent className="border-border-default bg-surface-card text-text-primary sm:max-w-2xl sm:rounded-2xl flex flex-col p-0 overflow-hidden">
        <div className="flex px-6 py-4 border-b border-border-default items-center justify-between bg-surface-card">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-text-primary">Create a Network</h2>
            <p className="text-sm text-text-secondary">Step {step} of 4</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] scrollbar-clean">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold mb-2">Choose a Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {networkTemplates.map((t) => {
                  const Icon = IconMap[t.icon] || Plus;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTemplate(t.id)}
                      className={clsx(
                        "flex flex-col text-left p-4 rounded-xl border transition-colors",
                        templateId === t.id
                          ? "border-accent-primary bg-accent-primary/10"
                          : "border-border-default bg-background-secondary hover:bg-surface-hover"
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={clsx("p-2 rounded-lg", templateId === t.id ? "bg-accent-primary text-white" : "bg-surface-card text-text-primary")}>
                          <Icon size={20} />
                        </div>
                        <span className="font-bold">{t.name}</span>
                      </div>
                      <span className="text-xs text-text-secondary">{t.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold mb-2">Name & Identity</h3>
              <label className="block space-y-2">
                <span className="text-sm font-bold">Network Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Hiking Club, Project Alpha"
                  autoFocus
                  className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold">Description (Optional)</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What is this network for?"
                  className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 h-24 resize-none"
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold mb-2">Privacy & Access</h3>
              <div className="space-y-3">
                <label className={clsx(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer",
                  privacy === "private" ? "border-accent-primary bg-accent-primary/5" : "border-border-default bg-background-secondary"
                )}>
                  <input type="radio" name="privacy" value="private" checked={privacy === "private"} onChange={() => setPrivacy("private")} className="mt-1" />
                  <div>
                    <span className="block font-bold flex items-center gap-2"><Lock size={16}/> Private</span>
                    <span className="text-sm text-text-secondary">Invitation only. Hidden from public discovery.</span>
                  </div>
                </label>
                <label className={clsx(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer",
                  privacy === "unlisted" ? "border-accent-primary bg-accent-primary/5" : "border-border-default bg-background-secondary"
                )}>
                  <input type="radio" name="privacy" value="unlisted" checked={privacy === "unlisted"} onChange={() => setPrivacy("unlisted")} className="mt-1" />
                  <div>
                    <span className="block font-bold flex items-center gap-2"><Globe size={16}/> Unlisted</span>
                    <span className="text-sm text-text-secondary">Anyone with the link can request to join.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-base font-bold">Review & Create</h3>
              
              <div className="p-4 rounded-xl bg-background-secondary border border-border-default space-y-4">
                <div>
                  <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Network Details</p>
                  <p className="font-bold text-lg">{name}</p>
                  {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
                </div>
                
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Template</p>
                    <p className="text-sm flex items-center gap-1.5 mt-1"><Shield size={14} className="text-accent-primary"/> {selectedTemplate.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Privacy</p>
                    <p className="text-sm capitalize mt-1">{privacy}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-3">Included in this template</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-background-secondary">
                    <p className="font-bold text-sm flex items-center gap-2 mb-2"><Users size={16} /> Roles</p>
                    <ul className="text-xs text-text-secondary space-y-1">
                      {selectedTemplate.roles && selectedTemplate.roles.length > 0 ? selectedTemplate.roles.map(r => <li key={r.name}>• {r.name}</li>) : <li>• Standard Member</li>}
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-background-secondary">
                    <p className="font-bold text-sm flex items-center gap-2 mb-2"><Info size={16} /> Categories</p>
                    <ul className="text-xs text-text-secondary space-y-1">
                      {selectedTemplate.categories ? selectedTemplate.categories.map(c => <li key={c.name}>• {c.name} ({c.rooms.length} rooms)</li>) : null}
                    </ul>
                  </div>
                </div>
              </div>

              {error && <p role="alert" className="text-sm text-danger-readable">{error}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border-default bg-surface-card">
          <button
            type="button"
            onClick={step === 1 ? () => setOpen(false) : handleBack}
            className="px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-hover rounded-xl transition-colors"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-2 text-sm font-bold text-white hover:bg-accent-secondary transition-colors"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-xl bg-success px-5 py-2 text-sm font-bold text-white hover:bg-success/90 transition-colors"
            >
              Create Network <Check size={16} />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
