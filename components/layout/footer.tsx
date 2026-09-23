import React from "react";
import { APP_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{APP_NAME}</span>
          <span>&copy; {new Date().getFullYear()}</span>
          <span>&middot;</span>
          <span>Privacy-Preserving Digital Identity</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
          <span>Real Data &amp; Verified Cryptography</span>
        </div>
      </div>
    </footer>
  );
}
