import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminUserSync } from "@/components/admin/admin-user-sync";

export default async function AdminLayout({
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
    (user.username ? `@${user.username}` : "Administrator");

  return (
    <AdminGuard>
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 transition-colors duration-200">
        {/* Silent Background User Sync */}
        <AdminUserSync />

        {/* Admin Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-12 h-12 ring-2 ring-indigo-500/40 dark:ring-indigo-500/60 hover:ring-indigo-500 transition-all",
                  },
                }}
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-rose-500 border-2 border-white dark:border-slate-950 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {displayName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30 uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Network Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {primaryEmail} &bull; Protocol Governance &amp; Authority Oversight
              </p>
            </div>
          </div>
        </div>

        {/* Admin Navigation Toolbar */}
        <AdminNav />

        {/* Main Admin Content */}
        <main className="min-h-[400px]">{children}</main>
      </div>
    </AdminGuard>
  );
}
