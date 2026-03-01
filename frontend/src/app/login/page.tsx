"use client";

import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Heart, Shield, Brain } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex bg-background relative overflow-hidden">
            {/* Rich Background Elements */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
            </div>

            {/* Left — Branding & Visuals */}
            <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-16 bg-card/30 border-r border-border/50 relative backdrop-blur-3xl z-10">
                {/* Glow behind 3D element */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-2 group cursor-default">
                        <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="text-xl font-bold text-foreground tracking-tight block">
                                Aurevia Health
                            </span>
                            <span className="text-[10px] uppercase font-bold text-primary tracking-[0.2em] opacity-80">
                                AI Clinical Copilot
                            </span>
                        </div>
                    </div>
                </div>

                {/* Minimal medical illustration (kept exactly as you requested) */}
                <div className="flex-1 flex items-center justify-center perspective-1000">
                    <div className="relative w-96 h-96 flex items-center justify-center">
                        {/* CSS Animations defined locally */}
                        <style jsx>{`
                            @keyframes beacon {
                                0% { transform: scale(1); opacity: 0.15; border-width: 1px; }
                                50% { transform: scale(1.5); opacity: 0.05; border-width: 2px; }
                                100% { transform: scale(2); opacity: 0; border-width: 1px; }
                            }
                            @keyframes pulse-beat {
                                0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(var(--primary), 0)); }
                                15% { transform: scale(1.15); filter: drop-shadow(0 0 15px rgba(var(--primary), 0.4)); }
                                30% { transform: scale(1.05); }
                                45% { transform: scale(1.2); filter: drop-shadow(0 0 20px rgba(var(--primary), 0.6)); }
                            }
                            @keyframes float {
                                0%, 100% { transform: translateY(0) rotate(0deg); }
                                50% { transform: translateY(-15px) rotate(2deg); }
                            }
                            @keyframes orbit {
                                from { transform: rotate(0deg) translateX(140px) rotate(0deg); }
                                to { transform: rotate(360deg) translateX(140px) rotate(-360deg); }
                            }
                            @keyframes orbit-reverse {
                                from { transform: rotate(360deg) translateX(110px) rotate(-360deg); }
                                to { transform: rotate(0deg) translateX(110px) rotate(0deg); }
                            }
                            @keyframes orbit-slow {
                                from { transform: rotate(180deg) translateX(170px) rotate(-180deg); }
                                to { transform: rotate(540deg) translateX(170px) rotate(-540deg); }
                            }
                            .perspective-1000 { perspective: 1000px; }
                            .preserve-3d { transform-style: preserve-3d; }
                            .animate-pulse-beat { animation: pulse-beat 2s infinite cubic-bezier(0.4, 0, 0.6, 1); }
                            .animate-orbit { animation: orbit 15s infinite linear; }
                            .animate-orbit-reverse { animation: orbit-reverse 20s infinite linear; }
                            .animate-orbit-slow { animation: orbit-slow 25s infinite linear; }
                            .animate-float { animation: float 6s infinite ease-in-out; }
                            .animate-beacon { animation: beacon 3s infinite ease-out; }
                        `}</style>

                        {/* Background Beacons */}
                        <div className="absolute w-24 h-24 rounded-full border border-primary/30 animate-beacon" />
                        <div className="absolute w-24 h-24 rounded-full border border-primary/30 animate-beacon" style={{ animationDelay: '1s' }} />
                        <div className="absolute w-24 h-24 rounded-full border border-primary/30 animate-beacon" style={{ animationDelay: '2s' }} />

                        {/* Abstract medical circles - Rotating group */}
                        <div className="absolute inset-0 flex items-center justify-center preserve-3d rotate-x-12">
                            <div className="absolute w-80 h-80 rounded-full border border-border/40 border-dashed animate-[spin_60s_linear_infinite]" />
                            <div className="absolute w-64 h-64 rounded-full border border-primary/10 animate-[spin_40s_linear_infinite_reverse]" />
                            <div className="absolute w-48 h-48 rounded-full border border-border/60" />
                        </div>

                        {/* Center Beating Pulse */}
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="w-32 h-32 rounded-full bg-primary/[0.04] border border-primary/20 flex items-center justify-center backdrop-blur-sm animate-pulse-beat group cursor-pointer shadow-2xl shadow-primary/5">
                                <Activity className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
                            </div>
                        </div>

                        {/* Orbiting Icons */}
                        <div className="absolute inset-0 flex items-center justify-center preserve-3d">
                            {/* Heart - High Orbit */}
                            <div className="absolute animate-orbit">
                                <div className="p-3 rounded-2xl bg-secondary/10 border border-secondary/20 shadow-xl shadow-secondary/5 backdrop-blur-md animate-float">
                                    <Heart className="w-6 h-6 text-secondary fill-secondary/10" />
                                </div>
                            </div>

                            {/* Shield - Inner Orbit Reverse */}
                            <div className="absolute animate-orbit-reverse">
                                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-md animate-float" style={{ animationDelay: '-2s' }}>
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                            </div>

                            {/* Brain - Outer Slow Orbit */}
                            <div className="absolute animate-orbit-slow">
                                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 shadow-xl shadow-amber-500/5 backdrop-blur-md animate-float" style={{ animationDelay: '-4s' }}>
                                    <Brain className="w-6 h-6 text-amber-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        System v4.0.2 Active
                    </div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight leading-[1.1]">
                        The Next Era of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Clinical Workflows</span>
                    </h1>
                    <p className="text-sm text-muted mt-4 leading-relaxed max-w-sm opacity-80">
                        Real-time transcription, AI diagnostics, and automated patient narratives designed to eliminate clinician burnout.
                    </p>
                </div>
            </div>

            {/* Right — Login Card */}
            <div className="flex-1 flex items-center justify-center p-8 relative z-10">
                <div className="w-full max-w-md">
                    {/* Mobile branding */}
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-foreground tracking-tight">
                            Aurevia Health
                        </span>
                    </div>

                    <div className="relative group">
                        {/* Background glow for card */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/10 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                        <div className="relative bg-card/80 border border-border/50 rounded-[2.5rem] shadow-2xl p-10 backdrop-blur-xl">
                            <div className="mb-10">
                                <h2 className="text-2xl font-bold text-foreground tracking-tight">Clinical Portal</h2>
                                <p className="text-sm text-muted mt-2">Enter your credentials to access the workspace</p>
                            </div>

                            {/* Demo credentials display */}
                            <div className="bg-surface/50 rounded-2xl p-6 mb-8 border border-border/40 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                                    <Shield className="w-16 h-16" />
                                </div>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-4">
                                    Authorized Physician Session
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted font-medium">Physician</span>
                                        <span className="text-xs text-foreground font-semibold">Dr. Ananya Rao</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted font-medium">Clearance</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">Level 4</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push("/dashboard")}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 cursor-pointer group active:scale-[0.98]"
                            >
                                Enter Workspace
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <div className="mt-8 flex items-center justify-center gap-6 opacity-40 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-1.5 grayscale opacity-60">
                                    <Shield className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">HIPAA SECURE</span>
                                </div>
                                <div className="flex items-center gap-1.5 grayscale opacity-60">
                                    <Brain className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">GEN-AI READY</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-muted-light text-center mt-8">
                                Secure clinical gateway. Automated audit logs enabled.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
