"use client";

import React from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { VerifyCredentialForm } from "./verify-credential-form";
import { VerificationHistoryTable } from "./verification-history-table";
import Link from "next/link";

export function VerifierDashboard() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  const isVerifierOrAdmin =
    isAuthenticated && (currentUser?.role === "verifier" || currentUser?.role === "admin");

  const availableCredentials = useQuery(
    api.verifications.getAvailableCredentialsForVerifier,
    isVerifierOrAdmin ? {} : "skip"
  );
  const history = useQuery(
    api.verifications.getVerificationHistory,
    isVerifierOrAdmin ? { limit: 50 } : "skip"
  );

  if (isAuthLoading || (isAuthenticated && currentUser === undefined)) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-slate-500">Checking verifier authorization enclave...</p>
      </div>
    );
  }

  // Strict Client Role Check (mirrors server requireRole check)
  if (!currentUser || (currentUser.role !== "verifier" && currentUser.role !== "admin")) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Access Denied: Verifier Role Required
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          This dashboard and the cryptographic verification engine are restricted to authorized <strong className="text-slate-800 dark:text-slate-200">Verifier</strong> and <strong className="text-slate-800 dark:text-slate-200">Admin</strong> roles.
        </p>
        <p className="text-[11px] font-mono text-slate-500">
          Current authenticated role: <span className="text-rose-600 font-bold">{currentUser?.role || "unauthenticated"}</span>
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all"
          >
            &larr; Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalAudits = history?.length ?? 0;
  const verifiedCount = history?.filter((h) => h.result === "VERIFIED").length ?? 0;
  const revokedCount = history?.filter((h) => h.result === "REVOKED").length ?? 0;
  const availableCount = availableCredentials?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs font-mono text-indigo-700 dark:text-indigo-400 mb-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            <span>Cryptographic Verification Authority</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Verifier Console
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Independently audit and verify W3C Verifiable Credentials against decentralized issuer DIDs and Convex state
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
            Role: {currentUser.role.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Audits Run</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalAudits}</div>
          <span className="text-[10px] text-slate-400 font-mono">Recorded in Convex log</span>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Verified Valid</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{verifiedCount}</div>
          <span className="text-[10px] text-slate-400 font-mono">Untampered &amp; active</span>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Revocations Caught</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{revokedCount}</div>
          <span className="text-[10px] text-slate-400 font-mono">Revoked credentials flagged</span>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Platform Credentials</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{availableCount}</div>
          <span className="text-[10px] text-slate-400 font-mono">Available for verification</span>
        </div>
      </div>

      {/* Main Verification Form */}
      <VerifyCredentialForm />

      {/* Audit History Table */}
      <VerificationHistoryTable />
    </div>
  );
}
