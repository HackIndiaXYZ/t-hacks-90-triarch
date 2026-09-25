"use client";

import React, { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AdminUsersPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  const allUsers = useQuery(
    api.users.getAllUsers,
    isAuthenticated ? {} : "skip"
  );
  const adminUpdateUserRole = useMutation(api.users.adminUpdateUserRole);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "issuer" | "verifier" | "admin">("all");
  const [editingUser, setEditingUser] = useState<{
    user: (typeof allUsers extends (infer U)[] | undefined ? U : never) | null;
    newRole: "user" | "issuer" | "verifier" | "admin";
  }>({ user: null, newRole: "user" });

  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const filteredUsers = (allUsers ?? []).filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchUsername = u.username?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchName = u.name?.toLowerCase().includes(q);
      const matchClerkId = u.clerkId.toLowerCase().includes(q);
      return matchUsername || matchEmail || matchName || matchClerkId;
    }

    return true;
  });

  const handleOpenEdit = (user: NonNullable<typeof allUsers>[number]) => {
    setEditingUser({ user, newRole: user.role });
    setActionError(null);
  };

  const handleSaveRole = async () => {
    if (!editingUser.user) return;
    setIsUpdating(true);
    setActionError(null);

    try {
      await adminUpdateUserRole({
        targetUserId: editingUser.user._id,
        newRole: editingUser.newRole,
      });
      setSuccessToast(`Updated role for ${editingUser.user.username ? `@${editingUser.user.username}` : editingUser.user.email} to '${editingUser.newRole}'.`);
      setEditingUser({ user: null, newRole: "user" });
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <span>Identity Network</span>
            <span>&middot;</span>
            <span>User Directory</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Registered Identities &amp; Roles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real authenticated identities synced from Clerk with backend-enforced roles in Convex.
          </p>
        </div>

        <div className="text-xs font-mono px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
          Total Users: <span className="font-bold text-slate-900 dark:text-white">{allUsers?.length ?? 0}</span>
        </div>
      </div>

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

      {/* Search & Role Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Role Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(["all", "user", "issuer", "verifier", "admin"] as const).map((tab) => {
            const count = (allUsers ?? []).filter((u) => tab === "all" || u.role === tab).length;
            const isActive = roleFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setRoleFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all duration-200 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative sm:w-72">
          <input
            type="text"
            placeholder="Search by username, email, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-500"
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

      {/* Users Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden backdrop-blur-md">
        {isAuthLoading || allUsers === undefined ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 border-2 border-slate-400 border-t-slate-800 dark:border-t-white rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Loading user directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No users found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
              No registered user records match your search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">User &amp; Identity</th>
                  <th className="py-3 px-4">Clerk Identifier</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Onboarding</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredUsers.map((u) => {
                  const usernameDisplay = u.username ? `@${u.username}` : "Unset";
                  const nameDisplay = u.name || u.email || "User";
                  const dateFormatted = new Date(u.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <tr
                      key={u._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User & Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {u.imageUrl ? (
                            <img
                              src={u.imageUrl}
                              alt={nameDisplay}
                              className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                              {(u.name || u.username || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              {usernameDisplay}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {u.email || "No email stored"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Clerk Subject ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                          {u.clerkId}
                        </span>
                      </td>

                      {/* Assigned Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                            u.role === "admin"
                              ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
                              : u.role === "issuer"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
                              : u.role === "verifier"
                              ? "bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30"
                              : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.role === "admin"
                                ? "bg-rose-500"
                                : u.role === "issuer"
                                ? "bg-indigo-500"
                                : u.role === "verifier"
                                ? "bg-cyan-400"
                                : "bg-slate-400"
                            }`}
                          />
                          {u.role}
                        </span>
                      </td>

                      {/* Onboarding Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            u.onboardingCompleted
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                          }`}
                        >
                          {u.onboardingCompleted ? "Completed" : "Pending"}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {dateFormatted}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                        >
                          Change Role
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Modification Modal */}
      {editingUser.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Modify User Authority Role
              </h3>
              <button
                onClick={() => setEditingUser({ user: null, newRole: "user" })}
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

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Identity:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {editingUser.user.username ? `@${editingUser.user.username}` : editingUser.user.email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Role:</span>
                <span className="text-indigo-600 dark:text-cyan-400 font-bold uppercase">
                  {editingUser.user.role}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select New Role:
              </label>
              <select
                value={editingUser.newRole}
                onChange={(e) =>
                  setEditingUser((prev) => ({
                    ...prev,
                    newRole: e.target.value as "user" | "issuer" | "verifier" | "admin",
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="user">User (Standard DID Holder)</option>
                <option value="issuer">Issuer (Credential Signing Authority)</option>
                <option value="verifier">Verifier (Relying Party Authority)</option>
                <option value="admin">Admin (Network Governance)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingUser({ user: null, newRole: "user" })}
                disabled={isUpdating}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
