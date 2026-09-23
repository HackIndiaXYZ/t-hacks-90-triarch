"use client";

import React from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ConvexAuthStatus() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();

  // Call the minimal authenticated Convex query when authenticated
  const viewer = useQuery(
    api.auth.getViewer,
    isAuthenticated ? {} : "skip"
  );

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-xl shadow-cyan-950/20">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
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
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Convex ↔ Clerk Auth Sync
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Step 5
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live verification of real Clerk JWT in Convex backend
            </p>
          </div>
        </div>

        {/* Real-time Status Badge */}
        <div>
          {isAuthLoading ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Syncing Token...
            </span>
          ) : isAuthenticated && viewer ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Convex Authenticated
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Not Authenticated
            </span>
          )}
        </div>
      </div>

      {/* Content Body */}
      {isAuthLoading ? (
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
          <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <span>Verifying Clerk session with Convex JWT validator...</span>
        </div>
      ) : viewer ? (
        <div className="space-y-3 mt-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-500 text-[11px] block mb-1">
              ctx.auth.getUserIdentity() &rarr; Subject / User ID:
            </span>
            <span className="text-cyan-300 break-all">{viewer.subject}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[11px] block mb-1">Recognized Email:</span>
              <span className="text-slate-200">{viewer.email || "No email in token"}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[11px] block mb-1">Recognized Name:</span>
              <span className="text-slate-200">{viewer.name || "N/A"}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-500 text-[11px] block mb-1">Issuer (Clerk Domain):</span>
            <span className="text-slate-400 text-[11px] break-all">{viewer.issuer}</span>
          </div>

          <p className="text-[11px] text-emerald-400/90 font-sans mt-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Zero database writes performed. Real Clerk user authenticated directly via Convex auth provider.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
          Waiting for Convex query response...
        </div>
      )}
    </div>
  );
}
