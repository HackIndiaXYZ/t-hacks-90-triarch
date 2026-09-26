"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface DashboardAuthGuardProps {
  children: React.ReactNode;
}

export function DashboardAuthGuard({ children }: DashboardAuthGuardProps) {
  const router = useRouter();
  const { isLoaded: isClerkLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isClerkLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isClerkLoaded, isSignedIn, router]);

  // If Clerk is still loading its session on client hydration
  if (!isClerkLoaded) {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-cyan-950/50 border border-sky-200 dark:border-cyan-500/30 flex items-center justify-center text-sky-600 dark:text-cyan-400">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Loading Verifi Workspace...
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm font-sans">
          Validating authenticated user session...
        </p>
      </div>
    );
  }

  // If confirmed signed out from Clerk, show nothing while router.replace executes
  if (!isSignedIn) {
    return null;
  }

  // User is authenticated in Clerk — render dashboard and allow Convex reactive sync
  return <>{children}</>;
}
