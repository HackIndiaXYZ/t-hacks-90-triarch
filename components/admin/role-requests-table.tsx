"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

interface EnrichedRoleRequest {
  _id: Id<"roleRequests">;
  _creationTime: number;
  userId: Id<"users">;
  clerkId: string;
  requestedRole: "issuer" | "verifier";
  organizationName: string;
  organizationType?: string;
  website?: string;
  contactEmail: string;
  useCaseDescription: string;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: number;
  reviewedBy?: string;
  adminNotes?: string;
  createdAt: number;
  updatedAt: number;
  user?: {
    _id: Id<"users">;
    clerkId: string;
    username?: string;
    email?: string;
    name?: string;
    imageUrl?: string;
    currentRole: "user" | "issuer" | "verifier" | "admin";
  } | null;
}

interface RoleRequestsTableProps {
  requests: EnrichedRoleRequest[];
  isLoading?: boolean;
}

export function RoleRequestsTable({ requests, isLoading = false }: RoleRequestsTableProps) {
  const approveRoleRequest = useMutation(api.roleRequests.approveRoleRequest);
  const rejectRoleRequest = useMutation(api.roleRequests.rejectRoleRequest);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [roleFilter, setRoleFilter] = useState<"all" | "issuer" | "verifier">("all");

  // Action Modal State
  const [actionModal, setActionModal] = useState<{
    type: "approve" | "reject" | "details" | null;
    request: EnrichedRoleRequest | null;
  }>({ type: null, request: null });

  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    // Status filter
    if (statusFilter !== "all" && req.status !== statusFilter) return false;

    // Role filter
    if (roleFilter !== "all" && req.requestedRole !== roleFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchOrg = req.organizationName.toLowerCase().includes(q);
      const matchEmail = req.contactEmail.toLowerCase().includes(q);
      const matchUsername = req.user?.username?.toLowerCase().includes(q);
      const matchName = req.user?.name?.toLowerCase().includes(q);
      const matchUseCase = req.useCaseDescription.toLowerCase().includes(q);
      return matchOrg || matchEmail || matchUsername || matchName || matchUseCase;
    }

    return true;
  });

  const handleOpenAction = (type: "approve" | "reject" | "details", request: EnrichedRoleRequest) => {
    setActionModal({ type, request });
    setAdminNotes(request.adminNotes || "");
    setActionError(null);
  };

  const handleConfirmAction = async () => {
    if (!actionModal.request || !actionModal.type || actionModal.type === "details") return;

    setIsProcessing(true);
    setActionError(null);

    try {
      if (actionModal.type === "approve") {
        await approveRoleRequest({
          requestId: actionModal.request._id,
          adminNotes: adminNotes.trim() || undefined,
        });
        setSuccessToast(`Successfully approved ${actionModal.request.organizationName} as ${actionModal.request.requestedRole.toUpperCase()}!`);
      } else if (actionModal.type === "reject") {
        await rejectRoleRequest({
          requestId: actionModal.request._id,
          adminNotes: adminNotes.trim() || undefined,
        });
        setSuccessToast(`Rejected request for ${actionModal.request.organizationName}.`);
      }

      setActionModal({ type: null, request: null });
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/40 text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Controls: Search and Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(["pending", "approved", "rejected", "all"] as const).map((tab) => {
            const count = requests.filter((r) => tab === "all" || r.status === tab).length;
            const isActive = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all duration-200 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                }`}
              >
                <span>{tab === "all" ? "All Requests" : tab}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Role Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "issuer" | "verifier")}
            className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="issuer">Issuer Requests</option>
            <option value="verifier">Verifier Requests</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search by organization, user, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden backdrop-blur-md">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Loading role onboarding requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No role requests found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto font-sans">
              {statusFilter === "pending"
                ? "There are no pending authority requests awaiting review."
                : "No requests match the selected filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Organization &amp; Entity</th>
                  <th className="py-3 px-4">Applicant Identity</th>
                  <th className="py-3 px-4">Requested Role</th>
                  <th className="py-3 px-4">Use Case / Scope</th>
                  <th className="py-3 px-4">Status &amp; Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredRequests.map((req) => {
                  const applicantUsername = req.user?.username ? `@${req.user.username}` : "Unset";
                  const applicantName = req.user?.name || req.user?.email || "User";
                  const dateFormatted = new Date(req.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <tr
                      key={req._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Organization & Entity */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {req.organizationName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {req.organizationType || "General Entity"}
                          </span>
                          {req.website && (
                            <a
                              href={req.website.startsWith("http") ? req.website : `https://${req.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-sky-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>{req.website.replace(/^https?:\/\//, "")}</span>
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Applicant Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {req.user?.imageUrl ? (
                            <img
                              src={req.user.imageUrl}
                              alt={applicantName}
                              className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                              {req.organizationName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                              {applicantUsername}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[150px]">
                              {req.contactEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Requested Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                            req.requestedRole === "issuer"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
                              : "bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              req.requestedRole === "issuer" ? "bg-indigo-500" : "bg-cyan-400"
                            }`}
                          />
                          {req.requestedRole}
                        </span>
                      </td>

                      {/* Use Case Preview */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {req.useCaseDescription}
                        </p>
                      </td>

                      {/* Status & Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase w-fit ${
                              req.status === "pending"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                                : req.status === "approved"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{dateFormatted}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleOpenAction("approve", req)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-all shadow-xs cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenAction("reject", req)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenAction("details", req)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer"
                            >
                              Review Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation & Details Modal */}
      {actionModal.type && actionModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    actionModal.type === "approve"
                      ? "bg-emerald-500"
                      : actionModal.type === "reject"
                      ? "bg-rose-500"
                      : "bg-indigo-500"
                  }`}
                />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {actionModal.type === "approve"
                    ? `Approve ${actionModal.request.requestedRole.toUpperCase()} Request`
                    : actionModal.type === "reject"
                    ? `Reject ${actionModal.request.requestedRole.toUpperCase()} Request`
                    : "Role Request Review Telemetry"}
                </h3>
              </div>
              <button
                onClick={() => setActionModal({ type: null, request: null })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-base font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 font-mono">
                {actionError}
              </div>
            )}

            {/* Request Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Organization:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{actionModal.request.organizationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Authority:</span>
                <span className="text-indigo-600 dark:text-cyan-400 font-bold uppercase">{actionModal.request.requestedRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contact Email:</span>
                <span className="text-slate-800 dark:text-slate-200">{actionModal.request.contactEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {actionModal.request.user?.username ? `@${actionModal.request.user.username}` : actionModal.request.clerkId}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Use Case &amp; Cryptographic Scope:
              </label>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                {actionModal.request.useCaseDescription}
              </div>
            </div>

            {actionModal.type !== "details" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Administrator Notes (Optional audit record):
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Verified university accreditation / Approved for KYC verification"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-sans"
                />
              </div>
            )}

            {actionModal.type === "approve" && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed font-sans">
                <strong>Enforcement Effect:</strong> Approving will immediately upgrade the user&apos;s role in the Convex database to <code className="font-mono font-bold">&quot;{actionModal.request.requestedRole}&quot;</code>.
              </div>
            )}

            {actionModal.type === "reject" && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed font-sans">
                <strong>Enforcement Effect:</strong> Rejecting marks the request as rejected. The user&apos;s active role will remain <code className="font-mono font-bold">&quot;user&quot;</code>.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActionModal({ type: null, request: null })}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              {actionModal.type === "approve" && (
                <button
                  onClick={handleConfirmAction}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? "Approving..." : `Confirm Approval (${actionModal.request.requestedRole.toUpperCase()})`}
                </button>
              )}
              {actionModal.type === "reject" && (
                <button
                  onClick={handleConfirmAction}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? "Rejecting..." : "Confirm Rejection"}
                </button>
              )}
              {actionModal.type === "details" && (
                <Button
                  size="sm"
                  onClick={() => setActionModal({ type: null, request: null })}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
