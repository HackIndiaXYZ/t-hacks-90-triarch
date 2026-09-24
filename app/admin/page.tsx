"use client";

import React from "react";
import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RoleRequestsTable } from "@/components/admin/role-requests-table";

export default function AdminOverviewPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  const stats = useQuery(
    api.roleRequests.getRoleRequestStats,
    isAuthenticated ? {} : "skip"
  );
  const allRequests = useQuery(
    api.roleRequests.getAllRoleRequests,
    isAuthenticated ? {} : "skip"
  );

  const pendingRequests = allRequests?.filter((r) => r.status === "pending") ?? [];

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Governance &amp; Authority Oversight</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review onboarding submissions, authorize W3C credential issuers, and manage relying party verifiers.
          </p>
        </div>

        <Link
          href="/admin/role-requests"
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-500/20 transition-all self-start sm:self-auto flex items-center gap-2"
        >
          <span>Manage All Requests</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Pending Role Requests */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats ? stats.pendingRequests : "-"}
            </span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
              Action Required
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-sans">
            Formal applications from institutions awaiting authorization.
          </p>
        </div>

        {/* 2. Active Issuers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Authorized Issuers</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats ? stats.activeIssuers : "-"}
            </span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
              Signing Authorities
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-sans">
            Entities allowed to issue W3C cryptographic credentials.
          </p>
        </div>

        {/* 3. Active Verifiers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Authorized Verifiers</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats ? stats.activeVerifiers : "-"}
            </span>
            <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold font-mono">
              Relying Parties
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-sans">
            Platforms authorized to request zero-knowledge presentations.
          </p>
        </div>

        {/* 4. Total Network Users */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-slate-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Network Identities</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats ? stats.totalUsers : "-"}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
              Registered
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-sans">
            Real authenticated Clerk accounts recorded in Convex.
          </p>
        </div>
      </div>

      {/* Action Banner for Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                {pendingRequests.length} Pending Role Request{pendingRequests.length > 1 ? "s" : ""} Awaiting Review
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                Review organizational credentials and approve or reject authority privileges.
              </span>
            </div>
          </div>

          <Link
            href="/admin/role-requests"
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 transition-all shrink-0 self-start sm:self-auto"
          >
            Review Requests &rarr;
          </Link>
        </div>
      )}

      {/* Role Requests Management Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Recent Authority Requests
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Live Convex Subscription
          </span>
        </div>

        <RoleRequestsTable
          requests={allRequests ?? []}
          isLoading={isAuthLoading || allRequests === undefined}
        />
      </div>
    </div>
  );
}
