"use client";

import { Activity, User } from "lucide-react";

export default function Navbar() {
    return (
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Activity className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground tracking-tight">
                        Ambient Clinical Intelligence
                    </span>
                    <span className="text-xs text-muted-light">—</span>
                    <span className="text-xs text-muted-light font-medium">Live Consultation</span>
                    <span className="relative flex h-2 w-2 ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right mr-2">
                    <p className="text-xs font-medium text-foreground leading-tight">Dr. Ananya Rao</p>
                    <p className="text-[11px] text-muted-light leading-tight">Internal Medicine</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center">
                    <User className="w-4 h-4 text-muted" />
                </div>
            </div>
        </header>
    );
}
