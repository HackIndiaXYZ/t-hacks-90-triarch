import React from "react";
import { CredentialsSection } from "@/components/dashboard/credentials-section";

export default function CredentialsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Verifiable Credentials Vault
        </h2>
        <p className="text-xs text-slate-400">
          Cryptographically signed claims, badges, and digital attestations
        </p>
      </div>

      <CredentialsSection />

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <h3 className="text-sm font-semibold text-white mb-2">
          Credential Standard Compliance
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed font-sans">
          TrustID conforms to the W3C Verifiable Credentials Data Model v2.0 with JSON-LD proofs and selective disclosure support.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 block mb-1">Supported Proof Types</span>
            <span className="text-slate-300">Ed25519Signature2020 &middot; JsonWebSignature2020</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 block mb-1">Status Registry</span>
            <span className="text-slate-300">BitstringStatusListEntry (Revocation Check)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
