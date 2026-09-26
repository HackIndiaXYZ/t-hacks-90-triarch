import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ConvexUserSync } from "@/components/dashboard/convex-user-sync";
import { DashboardAuthGuard } from "@/components/dashboard/dashboard-auth-guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const primaryEmail =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    "No primary email";

  const username = user.username;

  const displayName =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    (username ? `@${username}` : "Authenticated User");

  return (
    <DashboardAuthGuard>
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 transition-colors duration-200">
        {/* Top Banner & Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-12 h-12 ring-2 ring-sky-500/30 dark:ring-cyan-500/40 hover:ring-sky-500 dark:hover:ring-cyan-400 transition-all",
                  },
                }}
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {displayName}
                </h1>
                {username && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    @{username}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20">
                  Verified Session
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{primaryEmail}</p>
            </div>
          </div>
        </div>

        {/* Synchronize & Verify Convex User Record */}
        <ConvexUserSync />

        {/* Dashboard Sub-navigation Tabs */}
        <DashboardNav />

        {/* Main Workspace View */}
        <main className="min-h-[400px]">{children}</main>
      </div>
    </DashboardAuthGuard>
  );
}
