"use client";

import React from "react";
import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function NavbarAdminLink() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  const stats = useQuery(
    api.roleRequests.getRoleRequestStats,
    user?.role === "admin" ? {} : "skip"
  );

  if (user?.role !== "admin") {
    return null;
  }

  const pendingCount = stats?.pendingRequests ?? 0;

  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/30 transition-all shadow-xs"
    >
      <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span>Admin</span>
      {pendingCount > 0 && (
        <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-mono flex items-center justify-center font-bold animate-pulse">
          {pendingCount}
        </span>
      )}
    </Link>
  );
}
