"use client";

import React from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function VerificationHistoryTable() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const history = useQuery(
    api.verifications.getVerificationHistory,
    isAuthenticated ? { limit: 50 } : "skip"
  );

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Verification Audits
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immutable server-side audit records of credential verifications
            </p>
          </div>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          {history?.length ?? 0} Records
        </span>
      </div>

      {isAuthLoading || history === undefined ? (
        <div className="py-8 text-center text-xs font-mono text-slate-500">
          Loading verification audit history...
        </div>
      ) : history.length === 0 ? (
        <div className="py-8 text-center text-xs font-sans text-slate-500 dark:text-slate-400">
          No verifications have been performed yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 font-mono text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">Credential Type</th>
                <th className="py-2.5 px-4 font-semibold">Issuing Authority</th>
                <th className="py-2.5 px-4 font-semibold">Subject DID</th>
                <th className="py-2.5 px-4 font-semibold">Result</th>
                <th className="py-2.5 px-4 font-semibold">Audit Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {history.map((item) => {
                const typeName =
                  item.credentialType.find((t) => t !== "VerifiableCredential") || "VerifiableCredential";
                const isVerified = item.result === "VERIFIED";
                const isRevoked = item.result === "REVOKED";
                const isExpired = item.result === "EXPIRED";

                return (
                  <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(item.verifiedAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-sans">
                      {typeName}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-sans">
                      {item.issuerName}
                    </td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-[140px]" title={item.recipientDid}>
                      {item.recipientDid.slice(0, 16)}...
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isVerified
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                            : isRevoked
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                            : isExpired
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                            : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border border-red-200 dark:border-red-500/30"
                        }`}
                      >
                        {item.result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[10px] text-slate-400 font-mono truncate max-w-[100px]" title={item._id}>
                      {item._id.slice(0, 12)}...
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
