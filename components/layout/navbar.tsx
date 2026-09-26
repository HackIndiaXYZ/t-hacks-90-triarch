import React from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NavbarAdminLink } from "./navbar-admin-link";
import { NavbarVerifierLink } from "./navbar-verifier-link";
import { AccountSwitcher } from "@/components/auth/account-switcher";
import { APP_NAME } from "@/lib/constants";

export async function Navbar() {
  const { userId } = await auth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center p-0.5 shadow-md shadow-sky-500/20 group-hover:shadow-sky-500/30 transition-all duration-300">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center transition-colors">
              <svg
                className="w-5 h-5 text-sky-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300"
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
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-cyan-400 transition-colors">
              {APP_NAME}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-sky-600 dark:text-cyan-400 -mt-1">
              Verifiable Identity
            </span>
          </div>
        </Link>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-cyan-400 animate-pulse" />
            <span>Verifi Live</span>
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {!userId ? (
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-3 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 dark:from-cyan-500 dark:to-blue-600 px-3.5 py-2 rounded-xl shadow-sm shadow-sky-500/20 hover:shadow-md transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <AccountSwitcher />
              <NavbarAdminLink />
              <NavbarVerifierLink />
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-slate-700 hover:text-sky-600 dark:text-slate-300 dark:hover:text-cyan-400 px-2 sm:px-3 py-1.5 transition-colors"
              >
                Dashboard
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 ring-2 ring-sky-500/40 dark:ring-cyan-500/40 hover:ring-sky-500 dark:hover:ring-cyan-400 transition-all",
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
