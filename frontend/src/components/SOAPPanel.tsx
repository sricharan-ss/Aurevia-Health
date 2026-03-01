"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Stethoscope, Brain, ListChecks } from "lucide-react";

import type { SOAPData } from "@/types/clinical";

interface SOAPPanelProps {
    data: SOAPData | null;
}

export default function SOAPPanel({ data }: SOAPPanelProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentData = data || {
        subjective: ["Waiting for patient input..."],
        objective: ["Awaiting examination details..."],
        assessment: ["Pending analysis..."],
        plan: ["Awaiting clinical decisions..."]
    };

    if (!mounted) return null;

    const sections = [
        {
            key: "subjective",
            label: "Subjective",
            icon: ClipboardList,
            data: currentData.subjective,
            accent: "text-primary",
            bg: "bg-primary/[0.06]",
        },
        {
            key: "objective",
            label: "Objective",
            icon: Stethoscope,
            data: currentData.objective,
            accent: "text-secondary",
            bg: "bg-secondary/[0.06]",
        },
        {
            key: "assessment",
            label: "Assessment",
            icon: Brain,
            data: currentData.assessment,
            accent: "text-amber-600",
            bg: "bg-amber-50",
        },
        {
            key: "plan",
            label: "Plan",
            icon: ListChecks,
            data: currentData.plan,
            accent: "text-violet-600",
            bg: "bg-violet-50",
        },
    ];

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm h-full overflow-auto">
            <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">SOAP Note</h2>
                <p className="text-[11px] text-muted-light mt-0.5">Live AI generation</p>
            </div>
            <div className="p-4 space-y-4">
                {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <div key={section.key}>
                            <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg ${section.bg}`}>
                                <Icon className={`w-3.5 h-3.5 ${section.accent}`} />
                                <h3 className={`text-xs font-semibold uppercase tracking-wider ${section.accent}`}>
                                    {section.label}
                                </h3>
                            </div>
                            <ul className="space-y-1.5 pl-1">
                                {section.data && section.data.length > 0 ? (
                                    section.data.map((item: string, i: number) => (
                                        <li key={i} className="text-xs text-foreground leading-relaxed flex items-start gap-2">
                                            <span className="w-1 h-1 rounded-full bg-muted-light mt-1.5 shrink-0"></span>
                                            {item}
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-[11px] text-muted-light italic pl-3 pb-1">
                                        No {section.label} notes available yet...
                                    </li>
                                )}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
