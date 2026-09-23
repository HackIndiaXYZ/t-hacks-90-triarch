import React from "react";
import { ActivitySection } from "@/components/dashboard/activity-section";

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Audit & Disclosure Log
        </h2>
        <p className="text-xs text-slate-400">
          Immutable audit trails for authentication, credential issuance, and proof presentations
        </p>
      </div>

      <ActivitySection />

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <h3 className="text-sm font-semibold text-white mb-2">
          Privacy-Preserving Audit Architecture
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          All credential presentation and verification activities are recorded locally on the user device and verifiable on-chain without exposing private personal identifiable information (PII).
        </p>
      </div>
    </div>
  );
}
