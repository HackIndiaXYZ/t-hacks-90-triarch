"use client";

import React from "react";

export function CredentialsSection() {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all shadow-xl shadow-cyan-950/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-500/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Verifiable Credentials
            </h2>
            <p className="text-xs text-slate-400">
              Tamper-evident cryptographically verifiable claims & badges
            </p>
          </div>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          0 Items
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          No credentials yet.
        </h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Credentials issued by verified organizations will appear here.
        </p>
      </div>
    </div>
  );
}
