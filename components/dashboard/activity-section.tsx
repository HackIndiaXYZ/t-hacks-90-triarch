"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ActivitySection() {
  const auditLogs = useQuery(api.verifications.getAuditLogs, { limit: 20 });
  const eventCount = auditLogs ? auditLogs.length : 0;

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-sky-500/40 transition-all shadow-sm dark:shadow-xl dark:shadow-cyan-950/10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-100 dark:border-cyan-500/20 flex items-center justify-center text-sky-600 dark:text-cyan-400 shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
              Audit &amp; Activity Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immutable server-side records of cryptographic verification events
            </p>
          </div>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
          {eventCount} Event{eventCount !== 1 ? "s" : ""}
        </span>
      </div>

      {auditLogs === undefined ? (
        <div className="py-8 text-center text-xs font-mono text-slate-500">
          Loading audit events...
        </div>
      ) : auditLogs.length === 0 ? (
        /* Empty State */
        <div className="py-10 px-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-2 shadow-xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            No verification activity recorded yet.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed font-sans">
            Cryptographic credential audits, presentation requests, and verification disclosures will be logged here.
          </p>
        </div>
      ) : (
        /* Real Audit Logs Table */
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 font-mono text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold">Time</th>
                <th className="py-2.5 px-3.5 font-semibold">Event Type</th>
                <th className="py-2.5 px-3.5 font-semibold">Issuer Authority</th>
                <th className="py-2.5 px-3.5 font-semibold">Result</th>
                <th className="py-2.5 px-3.5 font-semibold">Audit Key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {auditLogs.map((log) => {
                const typeName =
                  log.credentialType.find((t) => t !== "VerifiableCredential") || "VerifiableCredential";
                const isVerified = log.result === "VERIFIED";
                const isRevoked = log.result === "REVOKED";
                const isExpired = log.result === "EXPIRED";

                return (
                  <tr key={log._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/50">
                    <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.verifiedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="py-2.5 px-3.5 font-sans font-medium text-slate-900 dark:text-slate-100">
                      Audit: {typeName}
                    </td>
                    <td className="py-2.5 px-3.5 font-sans text-slate-700 dark:text-slate-300">
                      {log.issuerName}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isVerified
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                            : isRevoked
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                            : isExpired
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                            : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border border-red-200 dark:border-red-500/30"
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[10px] text-slate-400 font-mono truncate max-w-[100px]" title={log._id}>
                      {log._id.slice(0, 10)}...
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
