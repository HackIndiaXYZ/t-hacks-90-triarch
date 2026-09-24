"use client";

import React from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RoleRequestsTable } from "@/components/admin/role-requests-table";

export default function AdminRoleRequestsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  const allRequests = useQuery(
    api.roleRequests.getAllRoleRequests,
    isAuthenticated ? {} : "skip"
  );
  const stats = useQuery(
    api.roleRequests.getRoleRequestStats,
    isAuthenticated ? {} : "skip"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/30 text-[11px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
            <span>Governance</span>
            <span>&middot;</span>
            <span>Authority Role Requests</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Role Requests &amp; Access Control
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review, evaluate, and authorize credential issuance and zero-knowledge proof verification privileges.
          </p>
        </div>

        {stats && (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs font-mono text-amber-700 dark:text-amber-300">
              <span className="font-bold">{stats.pendingRequests}</span> Pending
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-mono text-emerald-700 dark:text-emerald-300">
              <span className="font-bold">{stats.approvedRequests}</span> Approved
            </div>
          </div>
        )}
      </div>

      {/* Interactive Role Requests Table */}
      <RoleRequestsTable
        requests={allRequests ?? []}
        isLoading={isAuthLoading || allRequests === undefined}
      />
    </div>
  );
}
