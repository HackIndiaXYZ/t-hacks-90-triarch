"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function RoleAuthorizationCard() {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  const latestRequest = useQuery(
    api.roleRequests.getLatestRoleRequest,
    isAuthenticated ? {} : "skip"
  );
  const changeUserRole = useMutation(api.users.changeUserRole);

  const [testResult, setTestResult] = useState<{
    status: "idle" | "testing" | "success" | "forbidden";
    message: string;
  }>({ status: "idle", message: "" });

  const handleTestSelfPromotion = async () => {
    if (!currentUser) return;
    setTestResult({ status: "testing", message: "Sending mutation to backend..." });

    try {
      await changeUserRole({
        targetUserId: currentUser._id,
        newRole: "issuer",
      });
      setTestResult({
        status: "success",
        message: "Unexpected: Role was changed.",
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestResult({
        status: "forbidden",
        message: `Backend security enforced: ${errorMsg}`,
      });
    }
  };

  const userRole = currentUser?.role || "user";

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-sm dark:shadow-xl dark:shadow-indigo-950/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
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
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              Convex Role &amp; Authorization Engine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Backend-enforced role access control with onboarding request telemetry
            </p>
          </div>
        </div>

        {/* Current Active Role Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Active Role:</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30 font-mono flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-cyan-400 animate-pulse" />
            {userRole}
          </span>
        </div>
      </div>

      {/* Real-time Role Request Status Banner */}
      {latestRequest && (
        <div className="mb-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Onboarding Request:
              </span>
              <span className="capitalize font-mono font-bold text-sky-600 dark:text-cyan-400">
                {latestRequest.requestedRole} Access
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Status:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase ${
                  latestRequest.status === "pending"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                    : latestRequest.status === "approved"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                }`}
              >
                {latestRequest.status === "pending" ? "Pending Review" : latestRequest.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 mb-2">
            <div>
              <span className="text-slate-500">Organization:</span>{" "}
              <span className="text-slate-800 dark:text-slate-200 font-sans font-medium">
                {latestRequest.organizationName}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Contact Email:</span>{" "}
              <span className="text-slate-800 dark:text-slate-200">{latestRequest.contactEmail}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
            {latestRequest.status === "pending" ? (
              <>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Security Note:</span>{" "}
                Your request has been stored in the Convex database. Active role remains &quot;user&quot; until approved.
              </>
            ) : (
              <>Request processed on {new Date(latestRequest.updatedAt).toLocaleDateString()}.</>
            )}
          </p>
        </div>
      )}

      {/* Role Capabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
        {/* User Role Card */}
        <div
          className={`p-3 rounded-lg border ${
            userRole === "user"
              ? "bg-sky-50/60 border-sky-200 dark:bg-cyan-950/30 dark:border-cyan-500/40"
              : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-900 dark:text-white">1. User</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                userRole === "user"
                  ? "bg-sky-100 text-sky-800 dark:bg-cyan-500/20 dark:text-cyan-400 font-semibold"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              {userRole === "user" ? "Active" : "Locked"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            Standard digital identity holder. Default role for all real Clerk accounts.
          </p>
          <div className="mt-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
            requireUser() &rarr; Allowed
          </div>
        </div>

        {/* Issuer Role Card */}
        <div
          className={`p-3 rounded-lg border ${
            userRole === "issuer"
              ? "bg-indigo-50/60 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-500/40"
              : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-900 dark:text-white">2. Issuer</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                userRole === "issuer"
                  ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400 font-semibold"
                  : latestRequest?.requestedRole === "issuer" && latestRequest.status === "pending"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 font-semibold"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              {userRole === "issuer"
                ? "Active"
                : latestRequest?.requestedRole === "issuer" && latestRequest.status === "pending"
                ? "Pending"
                : "Protected"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            Authorized authority to issue verifiable credentials. Server-gated.
          </p>
          <div className="mt-2 text-[10px] font-mono text-rose-600 dark:text-rose-400 font-medium">
            requireIssuer() &rarr; {userRole === "issuer" ? "Allowed" : "Forbidden (Denied)"}
          </div>
        </div>

        {/* Verifier Role Card */}
        <div
          className={`p-3 rounded-lg border ${
            userRole === "verifier"
              ? "bg-amber-50/60 border-amber-200 dark:bg-amber-950/30 dark:border-amber-500/40"
              : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-900 dark:text-white">3. Verifier</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                userRole === "verifier"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 font-semibold"
                  : latestRequest?.requestedRole === "verifier" && latestRequest.status === "pending"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 font-semibold"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              {userRole === "verifier"
                ? "Active"
                : latestRequest?.requestedRole === "verifier" && latestRequest.status === "pending"
                ? "Pending"
                : "Protected"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            Relying party authorized to verify credentials and ZK proofs. Server-gated.
          </p>
          <div className="mt-2 text-[10px] font-mono text-rose-600 dark:text-rose-400 font-medium">
            requireVerifier() &rarr; {userRole === "verifier" ? "Allowed" : "Forbidden (Denied)"}
          </div>
        </div>
      </div>

      {/* Role Request CTA / Onboarding Link / Admin Console Link */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {userRole === "admin" ? (
          <>
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Administrative Governance Active
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                You have full governance privileges. Manage role applications and oversee network identities.
              </span>
            </div>

            <Link
              href="/admin"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all self-start sm:self-auto shrink-0 flex items-center gap-1.5"
            >
              <span>Governance Console</span>
              <span>&rarr;</span>
            </Link>
          </>
        ) : userRole === "issuer" || userRole === "verifier" ? (
          <>
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                {userRole === "issuer" ? "Authorized Credential Issuer" : "Authorized Relying Party Verifier"}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                Your authority credentials are fully verified and active on the Verifi network.
              </span>
            </div>

            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
              Authority Active
            </span>
          </>
        ) : (
          <>
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Role Onboarding &amp; Upgrade
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                Apply for Issuer or Verifier authority status or configure your decentralized identity preferences.
              </span>
            </div>

            <Link
              href="/onboarding"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-sky-700 hover:text-sky-800 dark:text-cyan-300 dark:hover:text-cyan-200 bg-sky-50 hover:bg-sky-100 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 border border-sky-200 dark:border-cyan-500/30 transition-all self-start sm:self-auto shrink-0 shadow-xs"
            >
              {latestRequest?.status === "pending" ? "Update Role Request &rarr;" : "Onboard as Issuer / Verifier &rarr;"}
            </Link>
          </>
        )}
      </div>

      {/* Backend Authorization Security Test */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Security Test: Attempt Self-Promotion
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
              Validates that an ordinary user cannot call <code className="text-sky-600 dark:text-cyan-400">changeUserRole</code> to escalate to issuer/verifier.
            </span>
          </div>

          <button
            onClick={handleTestSelfPromotion}
            disabled={testResult.status === "testing"}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 transition-all duration-200 self-start sm:self-auto shrink-0 shadow-xs cursor-pointer"
          >
            {testResult.status === "testing" ? "Testing Backend..." : "Test Self-Promotion Block"}
          </button>
        </div>

        {testResult.message && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs font-mono border ${
              testResult.status === "forbidden"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : testResult.status === "success"
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300"
                : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-0.5">
              {testResult.status === "forbidden" ? (
                <>
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>PASSED — Server Rejected Unauthorized Mutation</span>
                </>
              ) : (
                <span>Test Output</span>
              )}
            </div>
            <p className="text-[11px] opacity-90">{testResult.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
