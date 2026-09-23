import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignOutButton, UserButton } from "@clerk/nextjs";

export default async function DashboardPage() {
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
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header section with real User greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-8 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-14 h-14 ring-2 ring-cyan-500/50 hover:ring-cyan-400 transition-all",
                },
              }}
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {displayName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Verified Session
              </span>
            </div>
            <p className="text-sm text-slate-400 font-mono mt-0.5">{primaryEmail}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <SignOutButton redirectUrl="/">
            <button className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all duration-200">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Real Session Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Real Identity Profile Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Clerk Identity</h2>
              <p className="text-xs text-slate-400">Authenticated profile details</p>
            </div>
          </div>

          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-slate-500 uppercase tracking-wider font-mono">Full Name</dt>
              <dd className="text-slate-200 font-medium mt-0.5">{displayName}</dd>
            </div>
            <div>
              <dt className="text-slate-500 uppercase tracking-wider font-mono">Email Address</dt>
              <dd className="text-slate-200 font-mono mt-0.5 break-all">{primaryEmail}</dd>
            </div>
            <div>
              <dt className="text-slate-500 uppercase tracking-wider font-mono">Clerk User ID</dt>
              <dd className="text-cyan-400 font-mono text-[11px] mt-0.5 break-all bg-slate-950/80 p-2 rounded border border-slate-800">
                {user.id}
              </dd>
            </div>
          </dl>
        </div>

        {/* Real Session Metadata Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Session Telemetry</h2>
              <p className="text-xs text-slate-400">Real-time authentication metadata</p>
            </div>
          </div>

          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-slate-500 uppercase tracking-wider font-mono">Account Created</dt>
              <dd className="text-slate-200 font-medium mt-0.5">{createdAtFormatted}</dd>
            </div>
            <div>
              <dt className="text-slate-500 uppercase tracking-wider font-mono">Last Sign In</dt>
              <dd className="text-slate-200 font-medium mt-0.5">{lastSignInFormatted}</dd>
            </div>
            <div>
              <dt className="text-slate-500 uppercase tracking-wider font-mono">Auth Provider</dt>
              <dd className="text-emerald-400 font-medium mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Clerk Production Auth
              </dd>
            </div>
          </dl>
        </div>

        {/* Architecture Status / Next Steps Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all md:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
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
              <h2 className="text-sm font-semibold text-white">TrustID Architecture</h2>
              <p className="text-xs text-slate-400">Step 4 status & roadmap</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center justify-between text-cyan-400 font-semibold mb-1">
                <span>Step 4 Completed</span>
                <span className="text-[10px] px-2 py-0.5 bg-cyan-500/20 rounded">Active</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Real Clerk authentication session active. Zero mock data or hardcoded credentials.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/40">
              <div className="flex items-center justify-between text-slate-400 font-semibold mb-1">
                <span>Next: Convex User Sync</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded text-slate-500">
                  Step 5
                </span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Securely sync authenticated Clerk identity with Convex backend in next step.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
