import React from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from "@/lib/constants";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="relative flex-1 flex flex-col justify-center items-center overflow-hidden bg-cyber-grid py-20 px-4 sm:px-6 lg:px-8">
      {/* Ambient background glow */}
      <div className="absolute inset-0 glow-ambient pointer-events-none" />

      {/* Decorative gradient blur spheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[32rem] h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Security Shield Icon & Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-400 text-xs sm:text-sm font-medium mb-8 backdrop-blur-md shadow-lg shadow-cyan-950/50">
          <svg
            className="w-4 h-4 text-cyan-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="font-mono">{APP_NAME} Protocol</span>
          <span className="text-slate-500">&middot;</span>
          <span className="text-slate-400">Step 4: Real Clerk Authentication</span>
        </div>

        {/* Brand Name / Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
          <span className="block">{APP_NAME}</span>
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400">
            {APP_TAGLINE}
          </span>
        </h1>

        {/* Short Description */}
        <p className="max-w-2xl text-base sm:text-lg lg:text-xl text-slate-300 mb-10 leading-relaxed">
          {APP_DESCRIPTION}
        </p>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          {!userId ? (
            <>
              <Link href="/sign-up" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto min-w-[200px]">
                  Get Started
                </Button>
              </Link>
              <Link href="/sign-in" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto min-w-[140px]">
                  Sign In
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto min-w-[200px]">
                Go to Dashboard &rarr;
              </Button>
            </Link>
          )}
        </div>

        {/* Note on Real Authentication */}
        <p className="mt-6 text-xs font-mono text-slate-500">
          Powered by real Clerk authentication. No mock users or fake sessions.
        </p>
      </div>
    </div>
  );
}

