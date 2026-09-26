"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface CredentialViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawVcJson: string;
  credentialId: string;
  typeName: string;
  issuerName: string;
  recipientDid: string;
  status: "active" | "revoked";
}

export function CredentialViewerModal({
  isOpen,
  onClose,
  rawVcJson,
  credentialId,
  typeName,
  issuerName,
  recipientDid,
  status,
}: CredentialViewerModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawVcJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{typeName}</span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold uppercase ${
                    status === "active"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                  }`}
                >
                  {status}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Issued by {issuerName} &middot; W3C JSON-LD Data Model
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Telemetry Summary */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[10px] block">Credential ID:</span>
            <span className="text-slate-800 dark:text-slate-200 truncate block">{credentialId}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">Subject / Recipient DID:</span>
            <span className="text-sky-700 dark:text-cyan-300 truncate block">{recipientDid}</span>
          </div>
        </div>

        {/* Raw JSON-LD Display */}
        <div className="flex-1 p-5 overflow-y-auto font-mono text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">
              Signed Verifiable Credential Payload
            </span>
            <button
              onClick={handleCopy}
              className="text-xs text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copied ? (
                <>
                  <span className="text-emerald-600 dark:text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Raw JSON</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 overflow-x-auto text-[11px] leading-relaxed max-h-[380px] select-all scrollbar-thin">
            <code>{rawVcJson}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Cryptographic Proof: JsonWebSignature2020 (ECDSA P-256)</span>
          </div>

          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
