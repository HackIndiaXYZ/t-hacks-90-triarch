"use client";

import React from "react";

export interface VerificationReport {
  verificationId: string;
  result: "VERIFIED" | "INVALID" | "REVOKED" | "EXPIRED";
  credentialId: string;
  credentialType: string[];
  issuer: {
    did: string;
    name: string;
  };
  subjectDid: string;
  issuanceDate: string | null;
  expirationDate: string | null;
  claims: Record<string, unknown>;
  signatureValid: boolean;
  integrityValid: boolean;
  statusValid: boolean;
  expirationValid: boolean;
  failureReason?: string;
  blockchain?: {
    anchored?: boolean;
    credentialHash?: string;
    contractAddress?: string;
    txHash?: string;
    blockNumber?: number;
    network?: string;
    anchoredAt?: number;
  };
  verifiedAt: number;
  verifier: {
    id: string;
    name: string;
    role: string;
  };
}

interface VerificationResultCardProps {
  report: VerificationReport;
  onReset?: () => void;
}

export function VerificationResultCard({ report, onReset }: VerificationResultCardProps) {
  const isVerified = report.result === "VERIFIED";
  const isRevoked = report.result === "REVOKED";
  const isExpired = report.result === "EXPIRED";

  const typeName =
    report.credentialType.find((t) => t !== "VerifiableCredential") || "VerifiableCredential";

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner based on Result */}
      <div
        className={`p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isVerified
            ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
            : isRevoked
            ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-100"
            : isExpired
            ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-100"
            : "bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-100"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isVerified
                ? "bg-emerald-600 text-white"
                : isRevoked
                ? "bg-rose-600 text-white"
                : isExpired
                ? "bg-amber-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {isVerified ? (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            ) : isRevoked ? (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : isExpired ? (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider font-bold opacity-80">
                Authoritative Backend Result
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/60 dark:bg-black/30 border border-current">
                Convex Cryptographic Enclave
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-0.5">
              {report.result}
            </h2>
            <p className="text-xs opacity-90 mt-0.5 font-sans">
              {isVerified
                ? "Digital signature verified against issuer public key. Document integrity intact and active on network."
                : isRevoked
                ? "Cryptographic signature matches, but credential has been explicitly REVOKED by the issuing authority."
                : isExpired
                ? "Digital signature matches, but the credential has passed its expiration validity threshold."
                : report.failureReason || "Cryptographic signature or document integrity check failed. Document is invalid or modified."}
            </p>
          </div>
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all cursor-pointer shrink-0 self-start sm:self-auto shadow-xs"
          >
            Verify Another &rarr;
          </button>
        )}
      </div>

      {/* Verification Checks Grid */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono mb-3">
            7-Point Verification Matrix
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Check 1: Cryptographic Signature */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Digital Signature
                </span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    report.signatureValid
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                  }`}
                >
                  {report.signatureValid ? "✓" : "✗"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                ECDSA P-256 (SHA-256)
              </span>
            </div>

            {/* Check 2: Document Integrity */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Document Integrity
                </span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    report.integrityValid
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                  }`}
                >
                  {report.integrityValid ? "✓" : "✗"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {report.integrityValid ? "Zero Tampering" : "Tampered / Modified"}
              </span>
            </div>

            {/* Check 3: Revocation Status */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Revocation Check
                </span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    report.statusValid
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                  }`}
                >
                  {report.statusValid ? "✓" : "✗"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {report.statusValid ? "Active in Database" : "Revoked by Issuer"}
              </span>
            </div>

            {/* Check 4: Expiration Status */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Expiration Check
                </span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    report.expirationValid
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                  }`}
                >
                  {report.expirationValid ? "✓" : "✗"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {report.expirationDate ? new Date(report.expirationDate).toLocaleDateString() : "Indefinite"}
              </span>
            </div>
          </div>
        </div>

        {/* Credential Metadata & Identities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Issuing Authority
            </span>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Authority Name:</span>
              <span className="font-semibold text-slate-900 dark:text-white font-sans">
                {report.issuer.name}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500">Issuer W3C DID:</span>
              <span className="text-[11px] text-indigo-600 dark:text-cyan-400 break-all select-all">
                {report.issuer.did}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-slate-500">Issuance Date:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {report.issuanceDate ? new Date(report.issuanceDate).toLocaleString() : "Unknown"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Subject &amp; Schema
            </span>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Credential Type:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {typeName}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500">Recipient Subject DID:</span>
              <span className="text-[11px] text-sky-600 dark:text-cyan-400 break-all select-all">
                {report.subjectDid}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-slate-500">Credential ID:</span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={report.credentialId}>
                {report.credentialId}
              </span>
            </div>
          </div>
        </div>

        {/* Ethereum Sepolia Blockchain Anchor Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-950/60 border border-indigo-200/80 dark:border-indigo-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                Ξ
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                  <span>Ethereum Sepolia Blockchain Anchor</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                    Chain ID: 11155111
                  </span>
                </h4>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                report.blockchain?.anchored
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${report.blockchain?.anchored ? "bg-emerald-500" : "bg-slate-400"}`} />
              <span>{report.blockchain?.anchored ? "On-Chain Anchored & Matched" : "Off-Chain (Not Anchored)"}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Registry Contract Address:</span>
              <a
                href={`https://sepolia.etherscan.io/address/${report.blockchain?.contractAddress || "0xcd72712c39C5da6de61Ba40AF5EA69Bcd43185c5"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-cyan-400 hover:underline truncate"
              >
                {report.blockchain?.contractAddress || "0xcd72712c39C5da6de61Ba40AF5EA69Bcd43185c5"} ↗
              </a>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Credential SHA-256 Hash:</span>
              <span className="text-slate-700 dark:text-slate-300 truncate" title={report.blockchain?.credentialHash}>
                {report.blockchain?.credentialHash || "Computed on verify"}
              </span>
            </div>

            {report.blockchain?.txHash && (
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-0.5 sm:col-span-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Sepolia Transaction Hash:</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${report.blockchain.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline break-all"
                >
                  {report.blockchain.txHash} ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Verified Claims Payload Table */}
        {report.claims && Object.keys(report.claims).length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono mb-2">
              Verified Claims &amp; Disclosed Attributes
            </h3>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold w-1/3">Claim Attribute</th>
                    <th className="py-2.5 px-4 font-semibold">Verified Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {Object.entries(report.claims).map(([key, val]) => (
                    <tr key={key} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/50">
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {key}
                      </td>
                      <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100 font-sans font-semibold">
                        {String(val)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Log Footer */}
        <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Audit Event Logged to Convex Database</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Audit ID: <code className="text-slate-800 dark:text-slate-200">{report.verificationId}</code></span>
            <span>Timestamp: {new Date(report.verifiedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
