"use client";

import { Suspense } from "react";
import LiveConsultationLayout from "@/components/LiveConsultationLayout";

function LivePageContent() {
    return <LiveConsultationLayout />;
}

export default function LiveConsultationPage() {
    return (
        <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-muted">Loading consultation...</div>}>
            <LivePageContent />
        </Suspense>
    );
}
