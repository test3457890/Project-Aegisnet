import { Shield } from "lucide-react";
import { useNavigate } from "react-router";

export function LoginScreen() {
 const navigate = useNavigate();

 const handleLogin = (e: React.FormEvent) => {
 e.preventDefault();
 navigate("/app");
 };

 return (
 <div className="min-h-screen bg-background-primary flex flex-col items-center justify-center p-4">
 <div className="w-full max-w-md bg-background-secondary border border-border-default rounded-2xl p-8 shadow-2xl relative overflow-hidden">
 {/* Decorative background glow */}
 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-accent-primary/10 blur-3xl pointer-events-none" />

 <div className="flex flex-col items-center text-center mb-8 relative z-10">
 <div className="w-16 h-16 bg-accent-secondary/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
 <Shield className="w-8 h-8 text-accent-primary" />
 </div>
 <h1 className="text-2xl font-bold text-text-primary tracking-tight">AegisNet</h1>
 <p className="text-sm text-text-secondary mt-2 font-medium">
 Reachable to your people.<br />Invisible to everyone else.
 </p>
 </div>

 <form onSubmit={handleLogin} className="space-y-4 relative z-10">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Email or local ID</label>
 <input 
 type="text" 
 className="w-full bg-background-primary border border-border-default rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-blue-500 transition-all"
 placeholder="Enter your credentials"
 defaultValue="alex.operator@aegis"
 />
 </div>
 
 <div className="space-y-1">
 <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Prototype passphrase</label>
 <input 
 type="password" 
 className="w-full bg-background-primary border border-border-default rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-blue-500 transition-all"
 placeholder="••••••••••••"
 defaultValue="password"
 />
 </div>

 <button 
 type="submit"
 className="w-full bg-accent-secondary hover:bg-accent-primary text-text-primary font-medium py-3 rounded-lg mt-4 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.2)]"
 >
 Open Prototype
 </button>
 </form>

 <div className="mt-6 text-center">
 <p className="text-xs text-text-primary0 flex items-center justify-center gap-1.5">
 <Shield className="w-3.5 h-3.5" /> Private prototype session
 </p>
 </div>
 </div>
 </div>
 );
}
