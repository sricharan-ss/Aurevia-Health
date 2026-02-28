"use client";

import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Heart, Shield, Brain } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex bg-background">
            {/* Left — Branding */}
            <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 bg-card border-r border-border">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-foreground tracking-tight">
                            Aurevia Health
                        </span>
                    </div>
                    <p className="text-sm text-muted mt-1">AI Clinical Copilot Platform</p>
                </div>

                {/* Minimal medical illustration */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-80 h-80">
                        {/* Abstract medical circles */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-64 h-64 rounded-full border border-border/60" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-48 h-48 rounded-full border border-primary/15" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-32 h-32 rounded-full bg-primary/[0.04] border border-primary/10 flex items-center justify-center">
                                <Activity className="w-10 h-10 text-primary/40" />
                            </div>
                        </div>
                        {/* Orbiting icons */}
                        <div className="absolute top-6 right-12">
                            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                                <Heart className="w-5 h-5 text-secondary" />
                            </div>
                        </div>
                        <div className="absolute bottom-12 left-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-primary" />
                            </div>
                        </div>
                        <div className="absolute bottom-6 right-16">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-amber-500" />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h1 className="text-2xl font-semibold text-foreground tracking-tight leading-snug">
                        Ambient Clinical Intelligence
                    </h1>
                    <p className="text-sm text-muted mt-2 leading-relaxed max-w-md">
                        Real-time transcription, AI-powered clinical decision support, and automated documentation — designed for modern healthcare.
                    </p>
                </div>
            </div>

            {/* Right — Login Card */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-sm">
                    {/* Mobile branding */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-foreground tracking-tight">
                            Aurevia Health
                        </span>
                    </div>

                    <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-foreground">Welcome back</h2>
                            <p className="text-sm text-muted mt-1">Sign in to your clinical workspace</p>
                        </div>

                        {/* Demo credentials display */}
                        <div className="bg-surface rounded-xl p-4 mb-6 border border-border/50">
                            <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-2">
                                Demo Credentials
                            </p>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted">Doctor</span>
                                    <span className="text-xs text-foreground font-medium">Dr. Ananya Rao</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted">Department</span>
                                    <span className="text-xs text-foreground font-medium">Internal Medicine</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => router.push("/dashboard")}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-150 cursor-pointer group"
                        >
                            Demo Login
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        <p className="text-[11px] text-muted-light text-center mt-4">
                            This is a demo environment. No authentication required.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
