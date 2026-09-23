import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ConvexUserSync } from "@/components/dashboard/convex-user-sync";

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

  const displayName =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Authenticated User";

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner & Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-12 h-12 ring-2 ring-cyan-500/40 hover:ring-cyan-400 transition-all",
                },
              }}
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {displayName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Verified Session
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{primaryEmail}</p>
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
  );
}
