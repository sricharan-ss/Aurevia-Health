"use client";

import { MessageSquare } from "lucide-react";
import { transcriptMessages } from "@/data/mockData";

export default function TranscriptPanel() {
    return (
        <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border shrink-0">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted" />
                    Transcript
                </h2>
                <p className="text-[11px] text-muted-light mt-0.5">Live conversation capture</p>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
                {transcriptMessages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === "doctor" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`
                max-w-[85%] rounded-xl px-3.5 py-2.5
                ${msg.role === "doctor"
                                    ? "bg-primary text-white rounded-br-md"
                                    : "bg-surface text-foreground rounded-bl-md"
                                }
              `}
                        >
                            <p className="text-xs leading-relaxed">{msg.text}</p>
                            <p
                                className={`text-[10px] mt-1 ${msg.role === "doctor" ? "text-white/60" : "text-muted-light"
                                    }`}
                            >
                                {msg.timestamp}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
