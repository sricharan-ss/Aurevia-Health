"use client";

import { X, ShieldAlert, Pill, Brain, Quote } from "lucide-react";
import type { AlertData } from "@/data/mockData";

interface ExplainabilityModalProps {
    alert: AlertData;
    onClose: () => void;
}

export default function ExplainabilityModal({ alert, onClose }: ExplainabilityModalProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center modal-overlay"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" />

            {/* Modal */}
            <div
                className="relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-xl border border-border modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-alert/10 flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-alert" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground">{alert.title}</h2>
                            <p className="text-xs text-muted-light">Alert {alert.id} · {alert.timestamp}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-surface flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4 text-muted" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                    {/* Source Sentence */}
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Quote className="w-3 h-3" /> Source Sentence
                        </p>
                        <div className="bg-amber-50 border border-amber-200/60 rounded-lg px-4 py-3">
                            <p className="text-sm text-amber-900 leading-relaxed italic">
                                {alert.sourceSentence}
                            </p>
                        </div>
                    </div>

                    {/* Medications Involved */}
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Pill className="w-3 h-3" /> Medications Involved
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {alert.medicationsInvolved.map((med, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground font-medium"
                                >
                                    <Pill className="w-3 h-3 text-primary" />
                                    {med}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* AI Reasoning */}
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Brain className="w-3 h-3" /> AI Reasoning
                        </p>
                        <div className="bg-surface rounded-lg px-4 py-3">
                            <p className="text-sm text-foreground leading-relaxed">
                                {alert.reasoning}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface transition-colors cursor-pointer"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>
    );
}
