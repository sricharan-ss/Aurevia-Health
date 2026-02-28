"use client";

import { useState, useEffect } from "react";
import { FileText, Pill, AlertTriangle, CheckCircle2 } from "lucide-react";

interface PatientSummaryProps {
    summary: string;
}

export default function PatientSummary({ summary }: PatientSummaryProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null; // Avoid hydration mismatch by waiting for client

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 mt-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted" />
                Live AI Summary
            </h2>

            <div className="space-y-4">
                <div className="bg-primary/[0.04] border border-primary/10 rounded-xl p-4">
                    <p className="text-xs text-foreground leading-relaxed italic">
                        "{summary || "Analyzing consultation in real-time..."}"
                    </p>
                </div>

                <div className="flex items-center gap-4 py-2 border-t border-border mt-2">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-[10px] font-medium text-muted uppercase">Diagnosis Pending</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-[10px] font-medium text-muted uppercase">Plan Syncing</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
