import React from "react";
import { APP_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">{APP_NAME}</span>
          <span>&copy; {new Date().getFullYear()}</span>
          <span>&middot;</span>
          <span>Privacy-Preserving Digital Identity</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
          <span>Real Data &amp; Verified Cryptography</span>
        </div>
      </div>
    </footer>
  );
}
