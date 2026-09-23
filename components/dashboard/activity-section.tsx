"use client";

import React from "react";

export function ActivitySection() {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all shadow-xl shadow-cyan-950/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Audit & Activity Log
            </h2>
            <p className="text-xs text-slate-400">
              Cryptographic verification records and authentication telemetry
            </p>
          </div>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          0 Events
        </span>
      </div>

      {/* Honest Empty State */}
      <div className="py-12 px-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          No activity yet.
        </h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Authentication events, credential verifications, and sharing disclosures will be logged here.
        </p>
      </div>
    </div>
  );
}
