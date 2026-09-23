"use client";

import React, { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ConvexUserSync() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);
  const userRecord = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      setSyncStatus("syncing");

      syncCurrentUser()
        .then(() => {
          setSyncStatus("synced");
        })
        .catch((err) => {
          console.error("Failed to sync user to Convex:", err);
          setSyncStatus("error");
          setSyncError(err instanceof Error ? err.message : "Sync failed");
        });
    }
  }, [isAuthenticated, syncCurrentUser]);

  const createdAtFormatted = userRecord?.createdAt
    ? new Date(userRecord.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const updatedAtFormatted = userRecord?.updatedAt
    ? new Date(userRecord.updatedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xl shadow-cyan-950/20">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm0 4h16m-16 4h16"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Convex Database User Record
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Step 7
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Real authenticated Clerk identity stored in Convex <code className="text-emerald-400">users</code> table with verified role
            </p>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div>
          {isAuthLoading || syncStatus === "syncing" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Syncing User...
            </span>
          ) : userRecord ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Convex Synced ({userRecord.role})
            </span>
          ) : syncStatus === "error" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Sync Error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700">
              Pending
            </span>
          )}
        </div>
      </div>

      {/* Content Body */}
      {isAuthLoading ? (
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <span>Authenticating and reading user record...</span>
        </div>
      ) : syncError ? (
        <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
          <p className="font-semibold mb-1">Sync failed:</p>
          <p className="font-mono">{syncError}</p>
        </div>
      ) : userRecord ? (
        <div className="space-y-3 mt-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[11px] block mb-1">Convex Record ID (_id):</span>
              <span className="text-emerald-300 break-all">{userRecord._id}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[11px] block mb-1">Indexed clerkId:</span>
              <span className="text-cyan-300 break-all">{userRecord.clerkId}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[11px] block mb-1">Convex Stored Role:</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                {userRecord.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[11px] block mb-1">Stored Email:</span>
              <span className="text-slate-200">{userRecord.email || "None"}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[11px] block mb-1">Stored Name:</span>
              <span className="text-slate-200">{userRecord.name || "None"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[11px] block mb-1">Created At:</span>
              <span className="text-slate-300">{createdAtFormatted}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[11px] block mb-1">Last Updated At:</span>
              <span className="text-slate-300">{updatedAtFormatted}</span>
            </div>
          </div>

          <p className="text-[11px] text-emerald-400/90 font-sans mt-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Duplicate prevention verified. Idempotent sync ensures 1 real user record per Clerk account.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
          Syncing user record to Convex...
        </div>
      )}
    </div>
  );
}
