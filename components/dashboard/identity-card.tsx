"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { provisionUserDid } from "@/lib/crypto/did-service";
import { hasLocalKey } from "@/lib/crypto/keystore";
import { Button } from "@/components/ui/button";

export function IdentityCard() {
  const { user: clerkUser } = useUser();
  const user = useQuery(api.users.getCurrentUser);
  const registerUserDid = useMutation(api.users.registerUserDid);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasPrivateKeyLocally, setHasPrivateKeyLocally] = useState<boolean | null>(null);

  // Check if private key is stored in this browser's IndexedDB
  useEffect(() => {
    if (clerkUser?.id && user?.did) {
      hasLocalKey(clerkUser.id).then((hasKey) => {
        setHasPrivateKeyLocally(hasKey);
      });
    }
  }, [clerkUser?.id, user?.did]);

  const handleGenerateDid = async () => {
    if (!clerkUser) {
      setErrorMsg("Authentication required to provision DID.");
      return;
    }

    if (user?.did) {
      // Idempotency guard: User already has a registered DID
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationStep("Generating real ECDSA P-256 key pair with Web Crypto API...");

    try {
      await new Promise((r) => setTimeout(r, 250));
      setGenerationStep("Deriving W3C did:key multicodec identifier & securing private key in IndexedDB...");

      const result = await provisionUserDid(
        clerkUser.id,
        user?.did,
        async ({ did, publicKey, keyType }) => {
          setGenerationStep("Registering public key metadata with Convex...");
          await registerUserDid({ did, publicKey, keyType });
        }
      );

      setHasPrivateKeyLocally(result.hasLocalPrivateKey);
      setGenerationStep("");
    } catch (err: unknown) {
      console.error("Failed to generate DID:", err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const didCreatedFormatted = user?.didCreatedAt
    ? new Date(user.didCreatedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const subjectDisplay =
    user?.username
      ? `@${user.username} (${user.email || clerkUser?.primaryEmailAddress?.emailAddress || user.clerkId})`
      : user?.email || user?.name || user?.clerkId || "Authenticated User";

  // Determine current state: "not-created" | "creating" | "created"
  const isCreated = Boolean(user?.did);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-sky-500/40 dark:hover:border-cyan-500/40 transition-all shadow-sm dark:shadow-xl dark:shadow-cyan-950/20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-100 dark:border-cyan-500/20 flex items-center justify-center text-sky-600 dark:text-cyan-400 shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Decentralized Identity (DID)</span>
              {isCreated && (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 uppercase">
                  W3C did:key
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Self-sovereign cryptographic identity backed by browser Web Crypto enclave
            </p>
          </div>
        </div>

        {/* Status Indicator Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isGenerating ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Status: Creating...
            </span>
          ) : isCreated ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Status: Created
            </span>
          ) : user === undefined ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-spin" />
              Loading...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Status: Not created
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 font-mono flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="space-y-4">
        {/* STATE 2: Creating in Progress */}
        {isGenerating && (
          <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 space-y-3 text-center animate-in fade-in">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-600 dark:border-t-amber-400 rounded-full animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Generating Cryptographic Identity...
            </h3>
            <p className="text-xs font-mono text-amber-800 dark:text-amber-300 max-w-md mx-auto">
              {generationStep}
            </p>
          </div>
        )}

        {/* STATE 3: Created DID */}
        {!isGenerating && isCreated && user && (
          <>
            {/* Primary W3C DID Identifier Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  W3C Decentralized Identifier (DID)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold uppercase">
                  Active
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-all select-all">
                  {user.did}
                </span>

                <button
                  onClick={() => handleCopy(user.did!, "did")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 dark:text-cyan-300 hover:text-sky-900 dark:hover:text-white bg-sky-50 dark:bg-cyan-500/10 hover:bg-sky-100 dark:hover:bg-cyan-500/20 border border-sky-200 dark:border-cyan-500/30 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  {copiedField === "did" ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy DID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Cryptographic Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              {/* Algorithm & Curve */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 text-[11px] block mb-0.5">Algorithm &amp; Key Type</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {user.keyType || "ECDSA-P256"} (secp256r1)
                </span>
              </div>

              {/* Storage Enclave Binding */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 text-[11px] block mb-0.5">Private Key Enclave</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {hasPrivateKeyLocally ? "IndexedDB WebCrypto Secured" : "Client Enclave Bound"}
                </span>
              </div>

              {/* Date Created */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 text-[11px] block mb-0.5">Provisioned Timestamp</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {didCreatedFormatted || "Active"}
                </span>
              </div>
            </div>

            {/* Public Key Details (Hex) */}
            {user.publicKey && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500 text-[11px]">Compressed Public Key (Hex):</span>
                  <button
                    onClick={() => handleCopy(user.publicKey!, "publicKey")}
                    className="text-[11px] text-sky-600 dark:text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {copiedField === "publicKey" ? "Copied!" : "Copy Key"}
                  </button>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 break-all text-slate-800 dark:text-slate-200 select-all">
                  {user.publicKey}
                </div>
              </div>
            )}
          </>
        )}

        {/* STATE 1: Not Created */}
        {!isGenerating && !isCreated && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                  W3C Decentralized Identifier
                </span>
                <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                  DID: Not created yet
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">
                  Generate your self-sovereign digital identifier. Backed by real browser Web Crypto key pairs.
                </p>
              </div>

              <Button
                onClick={handleGenerateDid}
                disabled={isGenerating}
                className="shrink-0 font-semibold"
              >
                Generate DID &rarr;
              </Button>
            </div>

            {/* Subject Context Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 text-[11px] block mb-1">Subject Identity:</span>
                <span className="text-slate-800 dark:text-slate-200 break-all font-sans font-medium">
                  {subjectDisplay}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 text-[11px] block mb-1">Cryptographic Keypair:</span>
                <span className="text-amber-700 dark:text-amber-400 font-semibold">Not generated yet</span>
              </div>
            </div>
          </div>
        )}

        {/* Security & Cryptographic Isolation Assurance */}
        <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-slate-950/40 border border-sky-100 dark:border-slate-800/60 flex items-start gap-2.5 text-xs font-sans text-slate-600 dark:text-slate-400 leading-relaxed">
          <svg className="w-4 h-4 text-sky-600 dark:text-cyan-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <strong className="text-slate-900 dark:text-slate-200 font-semibold">Zero-Knowledge Private Key Security:</strong>{" "}
            Your private key is generated and stored exclusively in your browser&apos;s local Web Crypto enclave (IndexedDB). It is never sent to Convex, never stored in a central database, and never leaves your device.
          </div>
        </div>
      </div>
    </div>
  );
}
