"use client";

import React, { useState, useRef, useEffect } from "react";
import { useClerk, useUser, useSessionList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function AccountSwitcher() {
  const router = useRouter();
  const { user: currentClerkUser } = useUser();
  const { setActive, signOut, openSignIn } = useClerk();
  const { sessions, isLoaded: isSessionsLoaded } = useSessionList();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const convexUser = useQuery(api.users.getCurrentUser);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isSessionsLoaded || !currentClerkUser || !sessions) {
    return null;
  }

  const activeRole = convexUser?.role || "user";
  const activeUsername =
    convexUser?.username || currentClerkUser.username || currentClerkUser.firstName || "User";

  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === currentClerkUser.id) return;
    setIsSwitching(sessionId);
    try {
      await setActive({ session: sessionId });
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to switch session:", err);
    } finally {
      setIsSwitching(null);
    }
  };

  const handleSignOutSingleSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await signOut({ sessionId });
      if (sessions.length <= 1) {
        router.push("/sign-in");
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to sign out session:", err);
    }
  };

  const handleAddAccount = () => {
    setIsOpen(false);
    if (openSignIn) {
      openSignIn({});
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs"
        title="Multi-Session Account Switcher"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="truncate max-w-[120px]">
          {activeUsername.startsWith("@") ? activeUsername : `@${activeUsername}`}
        </span>
        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {activeRole}
        </span>
        {sessions.length > 1 && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-500 text-white">
            {sessions.length}
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 p-2 space-y-1">
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              Active Sessions ({sessions.length})
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              Independent Tabs
            </span>
          </div>

          {/* Session List */}
          <div className="max-h-60 overflow-y-auto space-y-1 py-1 scrollbar-thin">
            {sessions.map((s) => {
              const isActive = s.user?.id === currentClerkUser.id;
              const sessionEmail =
                s.user?.primaryEmailAddress?.emailAddress ||
                s.user?.emailAddresses?.[0]?.emailAddress ||
                "";
              const sessionUsername =
                s.user?.username || s.user?.fullName || s.user?.firstName || "User";

              return (
                <div
                  key={s.id}
                  onClick={() => handleSwitchSession(s.id)}
                  className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isActive
                      ? "bg-sky-50 dark:bg-cyan-950/40 border border-sky-200 dark:border-cyan-500/30 text-slate-900 dark:text-white"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {s.user?.imageUrl ? (
                      <img
                        src={s.user.imageUrl}
                        alt={sessionUsername}
                        className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {sessionUsername.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold truncate text-[11px]">
                        {sessionUsername.startsWith("@") ? sessionUsername : `@${sessionUsername}`}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        {sessionEmail}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                        Active
                      </span>
                    ) : isSwitching === s.id ? (
                      <span className="text-[10px] font-mono text-sky-600 dark:text-cyan-400">
                        Switching...
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        Switch &rarr;
                      </span>
                    )}

                    <button
                      onClick={(e) => handleSignOutSingleSession(s.id, e)}
                      title="Sign out only this account"
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1">
            <button
              onClick={handleAddAccount}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Another Account</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
