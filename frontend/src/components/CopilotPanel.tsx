"use client";

import { MessageCircleQuestion, ShieldCheck, ShieldAlert } from "lucide-react";
import AlertCard from "./AlertCard";

import type { AlertData } from "@/types/clinical";

interface CopilotPanelProps {
    alerts: AlertData[];
    suggestedQuestions: string[];
    onAlertClick: (alert: AlertData) => void;
}

export default function CopilotPanel({ alerts, suggestedQuestions, onAlertClick }: CopilotPanelProps) {
    return (
        <div className="p-4 space-y-4 h-full">
            {/* Suggested Questions */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <MessageCircleQuestion className="w-4 h-4 text-secondary" />
                        Suggested Questions
                    </h2>
                    <p className="text-[11px] text-muted-light mt-0.5">AI-recommended follow-up questions</p>
                </div>
                <div className="p-3 space-y-2">
                    {suggestedQuestions && suggestedQuestions.length > 0 ? (
                        suggestedQuestions.map((q, i) => (
                            <div
                                key={i}
                                className="px-3 py-2.5 bg-secondary/[0.04] border border-secondary/15 rounded-lg text-xs text-foreground leading-relaxed hover:bg-secondary/[0.08] transition-colors duration-100 cursor-default"
                            >
                                {q}
                            </div>
                        ))
                    ) : (
                        <div className="py-6 text-center">
                            <p className="text-[11px] text-muted-light italic">Generating relevant questions...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Potential Alerts */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-alert" />
                        Potential Alerts
                    </h2>
                    <p className="text-[11px] text-muted-light mt-0.5">Real-time clinical safety checks</p>
                </div>
                <div className="p-3">
                    {alerts && alerts.length > 0 ? (
                        <div className="space-y-3">
                            {alerts.map((alert) => (
                                <AlertCard
                                    key={alert.id}
                                    alert={alert as any}
                                    onClick={() => onAlertClick(alert)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-2">
                                <ShieldCheck className="w-5 h-5 text-secondary" />
                            </div>
                            <p className="text-xs font-medium text-foreground mb-0.5">No critical alerts</p>
                            <p className="text-[11px] text-muted-light">All safety checks passed</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
