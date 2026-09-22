import React from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/30 transition-all duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              {APP_NAME}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-cyan-500/90 -mt-1">
              Verifiable Identity
            </span>
          </div>
        </Link>

        {/* Status Badge (Real architectural indicator) */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Step 1: Foundation</span>
          </div>
        </div>
      </div>
    </header>
  );
}
