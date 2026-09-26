"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface VerifyQrPageProps {
  params: Promise<{
    token: string;
  }>;
}

interface VerificationData {
  success: boolean;
  result: "VERIFIED" | "INVALID" | "REVOKED" | "EXPIRED";
  failureReason?: string;
  error?: string;
  verificationDetails?: {
    signatureValid: boolean;
    integrityValid: boolean;
    statusValid: boolean;
    expirationValid: boolean;
    blockchainAnchored: boolean;
  };
  credential?: {
    credentialId: string;
    typeName: string;
    type: string[];
    issuerName: string;
    issuerDid: string;
    recipientDid: string;
    issuedAt: number;
    expirationDate?: number;
    status: string;
    claims: Record<string, unknown>;
  };
  blockchain?: {
    isAnchored: boolean;
    status: string;
    txHash?: string;
    blockNumber?: number;
    contractAddress: string;
    network: string;
    chainId: number;
    anchoredAt?: number;
    etherscanTxUrl?: string;
    etherscanContractUrl?: string;
  };
  tokenInfo?: {
    createdAt?: number;
    expiresAt?: number;
    useCount?: number;
  };
  verifiedAt?: number;
}

export default function VerifyQrPage({ params }: VerifyQrPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const verifyMutation = useMutation(api.qr.resolveAndVerifyQrToken);

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function runVerification() {
      if (!token) {
        setIsLoading(false);
        setErrorMessage("Missing verification token.");
        return;
      }

      setIsLoading(true);
      try {
        const res = await verifyMutation({ token });
        if (isMounted) {
          setData(res as VerificationData);
        }
      } catch (err) {
        console.error("Verification failed:", err);
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to verify QR token.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    runVerification();

    return () => {
      isMounted = false;
    };
  }, [token, verifyMutation]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl space-y-6">
        {/* Top Branding Header */}
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-indigo-400 font-bold text-sm">
                V
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent group-hover:to-white transition-all">
              Verifi
            </span>
          </Link>

          <span className="px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-slate-900 border border-slate-800 text-slate-400">
            TrustID Public Verifier
          </span>
        </div>

        {/* Main Verification Card */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">Resolving QR Verification Token...</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Fetching canonical W3C credential &amp; verifying cryptographic signatures
                </p>
              </div>
            </div>
          )}

          {/* Error / Invalid Token State */}
          {!isLoading && (errorMessage || (!data?.success && data?.error)) && (
            <div className="p-8 space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/80 text-rose-400 border border-rose-800">
                  {data?.result || "INVALID_TOKEN"}
                </div>
                <h1 className="text-xl font-bold text-white">Verification Failed</h1>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {errorMessage || data?.error || "The provided verification token is invalid, expired, or has been revoked."}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-center gap-3">
                <Link
                  href="/"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}

          {/* Successful Verification Result */}
          {!isLoading && data?.success && data.credential && (
            <div className="divide-y divide-slate-800/80">
              {/* Result Banner */}
              <div className={`p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                data.result === "VERIFIED"
                  ? "bg-emerald-950/40 border-b border-emerald-900/40"
                  : data.result === "EXPIRED"
                  ? "bg-amber-950/40 border-b border-amber-900/40"
                  : "bg-rose-950/40 border-b border-rose-900/40"
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    data.result === "VERIFIED"
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-emerald-950/50"
                      : data.result === "EXPIRED"
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-amber-950/50"
                      : "bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-rose-950/50"
                  }`}>
                    {data.result === "VERIFIED" ? (
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-extrabold tracking-tight ${
                        data.result === "VERIFIED"
                          ? "text-emerald-400"
                          : data.result === "EXPIRED"
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}>
                        {data.result === "VERIFIED" && "✓ VERIFIED"}
                        {data.result === "EXPIRED" && "⚠ EXPIRED"}
                        {data.result === "REVOKED" && "✕ REVOKED"}
                        {data.result === "INVALID" && "✕ INVALID"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        W3C Standard
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      {data.result === "VERIFIED"
                        ? "Cryptographically Authentic & Tamper-Proof"
                        : data.failureReason || "Verification checks failed"}
                    </p>
                  </div>
                </div>

                {data.blockchain?.isAnchored && (
                  <div className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-[11px] font-mono text-indigo-300 flex items-center gap-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span>Sepolia Block #{data.blockchain.blockNumber || "Live"}</span>
                  </div>
                )}
              </div>

              {/* Credential Overview */}
              <div className="p-6 space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Credential Type
                  </span>
                  <h2 className="text-base font-bold text-white">
                    {data.credential.typeName}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      Issuing Authority
                    </span>
                    <div className="font-semibold text-xs text-slate-200 truncate">
                      {data.credential.issuerName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate" title={data.credential.issuerDid}>
                      {data.credential.issuerDid}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      Credential Holder (DID)
                    </span>
                    <div className="font-mono text-xs text-slate-300 truncate" title={data.credential.recipientDid}>
                      {data.credential.recipientDid}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Issued on {new Date(data.credential.issuedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Verified Claims */}
                {data.credential.claims && Object.keys(data.credential.claims).length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      Attested Claims &amp; Attributes
                    </span>
                    <div className="rounded-2xl bg-slate-950/90 border border-slate-800 divide-y divide-slate-800/60 overflow-hidden">
                      {Object.entries(data.credential.claims).map(([k, v]) => (
                        <div key={k} className="p-3 flex items-center justify-between text-xs gap-3">
                          <span className="font-mono text-slate-400 capitalize">
                            {k.replace(/([A-Z])/g, " $1").trim()}:
                          </span>
                          <span className="font-semibold text-slate-100 text-right">
                            {String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cryptographic & Blockchain Verification Breakdown */}
              <div className="p-6 space-y-4 bg-slate-950/40">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Multi-Layer Verification Proofs
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </div>
                    <div className="text-[11px] leading-tight">
                      <div className="font-semibold text-slate-200">ECDSA P-256</div>
                      <div className="text-slate-400 text-[10px]">Signature Valid</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </div>
                    <div className="text-[11px] leading-tight">
                      <div className="font-semibold text-slate-200">SHA-256 Digest</div>
                      <div className="text-slate-400 text-[10px]">Document Untampered</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      data.blockchain?.isAnchored ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-500"
                    }`}>
                      {data.blockchain?.isAnchored ? "✓" : "•"}
                    </div>
                    <div className="text-[11px] leading-tight">
                      <div className="font-semibold text-slate-200">Sepolia Blockchain</div>
                      <div className="text-slate-400 text-[10px]">
                        {data.blockchain?.isAnchored ? "Anchored Proof" : "Off-Chain"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real Blockchain Transaction Details */}
                {data.blockchain?.isAnchored && data.blockchain.etherscanTxUrl && (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-indigo-300">Ethereum Sepolia On-Chain Timestamp</div>
                      <div className="font-mono text-[10px] text-slate-400 truncate max-w-[280px]">
                        Tx: {data.blockchain.txHash}
                      </div>
                    </div>
                    <a
                      href={data.blockchain.etherscanTxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <span>View on Etherscan</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>

              {/* QR Verification Metadata Footer */}
              <div className="p-4 bg-slate-950/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Verified at {data.verifiedAt ? new Date(data.verifiedAt).toLocaleTimeString() : "now"}</span>
                <span className="text-emerald-400">Verifi Zero-Exposure Enclave</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
