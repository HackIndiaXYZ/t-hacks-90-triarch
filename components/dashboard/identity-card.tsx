"use client";

import React from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function IdentityCard() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-xl shadow-cyan-950/20">
      <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Decentralized Identity (DID)
            </h2>
            <p className="text-xs text-slate-400">
              Self-sovereign cryptographic identity identifier
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Status: Not created
          </span>
        </div>
      </div>

      {/* Identity State Content */}
      <div className="space-y-4">
        {/* DID Identifier Box */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-0.5">
                W3C Decentralized Identifier
              </span>
              <span className="font-mono text-sm font-semibold text-slate-300">
                DID: Not created yet
              </span>
            </div>
            <span className="self-start sm:self-auto text-[11px] font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-500">
              Uninitialized
            </span>
          </div>
        </div>

        {/* Real User Context details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
            <span className="text-slate-500 text-[11px] block mb-1">Subject Account</span>
            <span className="text-slate-300 break-all">
              {isLoading ? "Loading..." : user?.email || user?.clerkId || "Authenticated Session"}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
            <span className="text-slate-500 text-[11px] block mb-1">Cryptographic Keypair</span>
            <span className="text-slate-400">Not generated yet</span>
          </div>
        </div>

        {/* Informational Notice */}
        <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5">
          <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            TrustID issues W3C compliant DIDs backed by asymmetric key pairs. DID generation and wallet binding will activate in subsequent protocol steps.
          </p>
        </div>
      </div>
    </div>
  );
}
