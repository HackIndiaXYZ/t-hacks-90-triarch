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

      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Security Shield Icon & Protocol Badge */}
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
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span className="font-mono">{APP_NAME} Protocol</span>
          <span className="text-slate-500">&middot;</span>
          <span className="text-slate-400">Privacy-Preserving Digital Identity</span>
        </div>

        {/* Brand Name / Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
          <span className="block">{APP_NAME}</span>
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400">
            {APP_TAGLINE}
          </span>
        </h1>

        {/* Short Explanation of Privacy-Preserving Digital Identity */}
        <p className="max-w-3xl text-base sm:text-lg lg:text-xl text-slate-300 mb-10 leading-relaxed font-sans">
          {APP_DESCRIPTION} Take complete control of your digital identity with cryptographically secured credentials, zero-knowledge verification, and decentralized identifier standards.
        </p>

        {/* Action Buttons / CTAs */}
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
              <Button size="lg" className="w-full sm:w-auto min-w-[220px]">
                Go to Dashboard &rarr;
              </Button>
            </Link>
          )}
        </div>

        {/* Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left w-full">
          {/* Pillar 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              Self-Sovereign Identity
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cryptographic ownership of decentralized identifiers (DIDs) rooted in asymmetric key pairs without central points of failure.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              Verifiable Credentials
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard W3C verifiable claims issued by accredited authorities, instantly verifiable and tamper-resistant.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              Zero-Knowledge Privacy
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Selective disclosure and ZK proofs enable verifying credentials or eligibility without revealing underlying personal data.
            </p>
          </div>
        </div>

        {/* Protocol Note */}
        <p className="mt-12 text-xs font-mono text-slate-500">
          Step 8: Real TrustID UI & User Dashboard active. Real authentication & Convex backend synchronized.
        </p>
      </div>
    </div>
  );
}
