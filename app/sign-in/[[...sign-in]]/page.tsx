import React from "react";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Header link */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 group mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-md shadow-sky-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[6px] flex items-center justify-center transition-colors">
                <svg
                  className="w-4 h-4 text-sky-600 dark:text-cyan-400"
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
            <span className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-cyan-400 transition-colors">
              {APP_NAME}
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sign in to your account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real authenticated session via Clerk</p>
        </div>

        {/* Real Clerk SignIn component */}
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-xl dark:shadow-2xl rounded-2xl",
              headerTitle: "text-slate-900 dark:text-slate-100 font-bold",
              headerSubtitle: "text-slate-500 dark:text-slate-400 text-sm",
              socialButtonsBlockButton: "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors",
              socialButtonsBlockButtonText: "text-slate-700 dark:text-slate-200 font-medium",
              dividerLine: "bg-slate-200 dark:bg-slate-800",
              dividerText: "text-slate-400 dark:text-slate-500 text-xs font-mono",
              formFieldLabel: "text-slate-700 dark:text-slate-300 font-medium text-xs",
              formFieldInput: "bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-sky-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-sky-500 rounded-lg transition-all",
              formButtonPrimary: "bg-gradient-to-r from-sky-500 to-blue-600 dark:from-cyan-500 dark:to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-md shadow-sky-500/20 transition-all",
              footerActionText: "text-slate-500 dark:text-slate-400 text-xs",
              footerActionLink: "text-sky-600 dark:text-cyan-400 hover:text-sky-700 dark:hover:text-cyan-300 font-medium text-xs",
              identityPreviewText: "text-slate-800 dark:text-slate-200",
              identityPreviewEditButton: "text-sky-600 dark:text-cyan-400",
              formFieldAction: "text-sky-600 dark:text-cyan-400 text-xs",
            },
            variables: {
              colorPrimary: "#0284c7",
            },
          }}
        />
      </div>
    </div>
  );
}
