import React from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function SignUpPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-950">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Header link */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 group mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
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
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
            </div>
            <span className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">
              {APP_NAME}
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-slate-100">Create your account</h1>
          <p className="text-xs text-slate-400 mt-1">Real authenticated identity via Clerk</p>
        </div>

        {/* Real Clerk SignUp component */}
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl shadow-cyan-950/30 rounded-2xl",
              headerTitle: "text-slate-100 font-bold",
              headerSubtitle: "text-slate-400 text-sm",
              socialButtonsBlockButton: "bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors",
              socialButtonsBlockButtonText: "text-slate-200 font-medium",
              dividerLine: "bg-slate-800",
              dividerText: "text-slate-500 text-xs font-mono",
              formFieldLabel: "text-slate-300 font-medium text-xs",
              formFieldInput: "bg-slate-950/80 border-slate-800 text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg transition-all",
              formButtonPrimary: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-cyan-500/25 transition-all",
              footerActionText: "text-slate-400 text-xs",
              footerActionLink: "text-cyan-400 hover:text-cyan-300 font-medium text-xs",
              identityPreviewText: "text-slate-200",
              identityPreviewEditButton: "text-cyan-400 hover:text-cyan-300",
              formFieldAction: "text-cyan-400 hover:text-cyan-300 text-xs",
            },
            variables: {
              colorPrimary: "#06b6d4",
              colorBackground: "#0f172a",
            },
          }}
        />
      </div>
    </div>
  );
}
