import React from "react";
import { IdentityCard } from "@/components/dashboard/identity-card";

export default function IdentityPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Digital Identity Management
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Decentralized Identifiers (DIDs) and cryptographic public keys
        </p>
      </div>

      <IdentityCard />

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
          Protocol Specifications
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400 mb-1">DID Method</dt>
            <dd className="text-slate-800 dark:text-slate-300 font-medium">did:key / did:ion (Pending activation)</dd>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400 mb-1">Key Algorithm</dt>
            <dd className="text-slate-800 dark:text-slate-300 font-medium">Ed25519 / secp256k1</dd>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400 mb-1">Storage Binding</dt>
            <dd className="text-slate-800 dark:text-slate-300 font-medium">Encrypted Client Enclave</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
