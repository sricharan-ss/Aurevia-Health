"use client";

import { Suspense } from "react";
import ConsultationSummary from "@/components/ConsultationSummary";

function SummaryContent() {
    return <ConsultationSummary />;
}

export default function ConsultationSummaryPage() {
    return (
        <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-muted">Loading summary...</div>}>
            <SummaryContent />
        </Suspense>
    );
}
