"use client";

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";

interface TranscriptMessage {
    role: "doctor" | "patient";
    text: string;
    timestamp: string;
}

interface TranscriptPanelProps {
    messages: TranscriptMessage[];
}

export default function TranscriptPanel({ messages }: TranscriptPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border shrink-0">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted" />
                    Transcript
                </h2>
                <p className="text-[11px] text-muted-light mt-0.5">Live conversation capture</p>
            </div>
            <div
                ref={scrollRef}
                className="flex-1 overflow-auto p-4 space-y-3 scroll-smooth"
            >
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === "doctor" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`
                max-w-[85%] rounded-xl px-3.5 py-2.5
                ${msg.role === "doctor"
                                    ? "bg-primary text-white rounded-br-md shadow-sm"
                                    : "bg-surface text-foreground rounded-bl-md border border-border/50"
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
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-muted opacity-60">
                        <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                        Waiting for conversation to begin...
                    </div>
                )}
            </div>
        </div>
    );
}
