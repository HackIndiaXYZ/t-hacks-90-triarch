"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  // 1. Loading State
  if (isAuthLoading || (isAuthenticated && user === undefined)) {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-cyan-400">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500" />
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Verifying Network Administrator Privileges...
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm font-sans">
          Validating cryptographic session and checking role authorization in Convex...
        </p>
      </div>
    );
  }

  // 2. Access Denied State (User is not an admin)
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900/90 border-2 border-rose-200 dark:border-rose-500/30 shadow-xl dark:shadow-rose-950/20 backdrop-blur-xl relative overflow-hidden">
          {/* Top Decorative accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-5 shadow-sm">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 mb-3 border border-rose-200 dark:border-rose-500/30">
            403 Forbidden &bull; Restricted Zone
          </span>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Administrator Access Required
          </h2>

          <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
            The route you are attempting to access is restricted exclusively to authorized Verifi Network Administrators.
          </p>

          <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-left text-xs font-mono space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Your Identity:</span>
              <span className="text-slate-900 dark:text-slate-200 font-semibold truncate max-w-[180px]">
                {user?.username ? `@${user.username}` : user?.email || user?.clerkId || "Unauthenticated"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Active Role:</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold uppercase">
                {user?.role || "unassigned"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Required Role:</span>
              <span className="text-indigo-600 dark:text-cyan-400 font-bold uppercase">admin</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 dark:from-cyan-500 dark:to-blue-600 shadow-sm transition-all text-center"
            >
              &larr; Return to User Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. User is verified Admin
  return <>{children}</>;
}
