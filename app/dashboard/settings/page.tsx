import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { ConvexAuthStatus } from "@/components/dashboard/convex-auth-status";

import { PasskeysCard } from "@/components/dashboard/passkeys-card";

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const primaryEmail =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    "No primary email";

  const displayName =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Authenticated User";

  const createdAtFormatted = user.createdAt
    ? new Date(user.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Unknown";

  const lastSignInFormatted = user.lastSignInAt
    ? new Date(user.lastSignInAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Active Session";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Account & Security Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Clerk session telemetry, WebAuthn Passkeys, and Convex backend configuration
        </p>
      </div>

      {/* WebAuthn Passkeys Section */}
      <PasskeysCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Details Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md relative overflow-hidden">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Clerk Authentication Profile</span>
          </h3>

          <dl className="space-y-3 text-xs font-mono">
            {user.username && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Clerk Username</dt>
                <dd className="text-slate-900 dark:text-slate-200 font-bold">@{user.username}</dd>
              </div>
            )}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Display Name</dt>
              <dd className="text-slate-900 dark:text-slate-200 font-sans font-medium">{displayName}</dd>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Primary Email</dt>
              <dd className="text-slate-800 dark:text-slate-200 break-all">{primaryEmail}</dd>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Clerk Subject ID</dt>
              <dd className="text-blue-600 dark:text-cyan-400 text-[11px] break-all font-semibold">{user.id}</dd>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Created At</dt>
                <dd className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">{createdAtFormatted}</dd>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Last Sign In</dt>
                <dd className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">{lastSignInFormatted}</dd>
              </div>
            </div>
          </dl>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">Terminate active session:</span>
            <SignOutButton sessionId={user.id} redirectUrl="/">
              <button className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer">
                Sign Out Current Session
              </button>
            </SignOutButton>
          </div>
        </div>

        {/* Live Convex JWT Token Telemetry */}
        <ConvexAuthStatus />
      </div>
    </div>
  );
}
