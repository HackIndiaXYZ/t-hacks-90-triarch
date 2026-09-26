"use client";

import React, { useState } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { IssueCredentialModal } from "./issue-credential-modal";
import { CredentialViewerModal } from "./credential-viewer-modal";

export function CredentialsSection() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  const receivedCredentials = useQuery(
    api.credentials.getMyReceivedCredentials,
    isAuthenticated ? {} : "skip"
  );

  const isIssuer = currentUser?.role === "issuer" || currentUser?.role === "admin";

  const issuedCredentials = useQuery(
    api.credentials.getMyIssuedCredentials,
    isAuthenticated && isIssuer ? {} : "skip"
  );

  const revokeMutation = useMutation(api.credentials.revokeCredential);
  const recordAnchorPending = useMutation(api.blockchain.recordAnchorPending);
  const recordAnchorSuccess = useMutation(api.blockchain.recordAnchorSuccess);
  const recordAnchorFailure = useMutation(api.blockchain.recordAnchorFailure);

  const [activeTab, setActiveTab] = useState<"received" | "issued">("received");
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [viewingVc, setViewingVc] = useState<{
    isOpen: boolean;
    rawVcJson: string;
    credentialId: string;
    typeName: string;
    issuerName: string;
    recipientDid: string;
    status: "active" | "revoked";
  }>({
    isOpen: false,
    rawVcJson: "",
    credentialId: "",
    typeName: "",
    issuerName: "",
    recipientDid: "",
    status: "active",
  });

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [anchoringId, setAnchoringId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{ message: string; txHash?: string } | null>(null);

  const handleInspectVc = (cred: {
    rawVcJson: string;
    credentialId: string;
    type: string[];
    issuerName: string;
    recipientDid: string;
    status: "active" | "revoked";
  }) => {
    const typeName = cred.type.find((t) => t !== "VerifiableCredential") || "VerifiableCredential";
    setViewingVc({
      isOpen: true,
      rawVcJson: cred.rawVcJson,
      credentialId: cred.credentialId,
      typeName,
      issuerName: cred.issuerName,
      recipientDid: cred.recipientDid,
      status: cred.status,
    });
  };

  const handleRevoke = async (credentialDocId: Id<"credentials">, credentialName: string) => {
    if (!confirm(`Are you sure you want to revoke this credential (${credentialName})? This action cannot be undone.`)) {
      return;
    }

    setRevokingId(credentialDocId);
    try {
      await revokeMutation({
        credentialDocId,
        reason: "Revoked by issuing authority",
      });
      setSuccessToast({ message: `Credential '${credentialName}' has been revoked.` });
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error("Failed to revoke credential:", err);
      alert(err instanceof Error ? err.message : "Failed to revoke credential.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleAnchorToSepolia = async (cred: {
    _id: Id<"credentials">;
    rawVcJson: string;
    type: string[];
  }) => {
    setAnchoringId(cred._id);
    const typeName = cred.type.find((t) => t !== "VerifiableCredential") || "VerifiableCredential";

    try {
      // 1. Mark pending in Convex
      await recordAnchorPending({
        credentialDocId: cred._id,
        credentialHash: "pending_hash_calculation",
        network: "sepolia",
        chainId: 11155111,
        contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xcd72712c39C5da6de61Ba40AF5EA69Bcd43185c5",
      });

      // 2. Broadcast on-chain transaction to Ethereum Sepolia via server route
      const res = await fetch("/api/blockchain/anchor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawVcJson: cred.rawVcJson }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to anchor to Ethereum Sepolia.");
      }

      const anchorResult = data.data;

      // 3. Save confirmed transaction in Convex
      await recordAnchorSuccess({
        credentialDocId: cred._id,
        credentialHash: anchorResult.credentialHash,
        transactionHash: anchorResult.transactionHash || "0x_already_anchored",
        blockNumber: anchorResult.blockNumber || 0,
        anchoredAt: anchorResult.anchoredAt || Date.now(),
        contractAddress: anchorResult.contractAddress,
        network: anchorResult.network || "sepolia",
        chainId: anchorResult.chainId || 11155111,
      });

      setSuccessToast({
        message: `Successfully anchored '${typeName}' to Ethereum Sepolia!`,
        txHash: anchorResult.transactionHash,
      });
      setTimeout(() => setSuccessToast(null), 7000);
    } catch (err: unknown) {
      console.error("[Blockchain] Anchoring failed:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      await recordAnchorFailure({
        credentialDocId: cred._id,
        failureReason: errorMsg,
      });
      alert(`Blockchain Anchoring Failed: ${errorMsg}`);
    } finally {
      setAnchoringId(null);
    }
  };

  const displayedList = activeTab === "received" ? receivedCredentials : issuedCredentials;
  const countDisplay = displayedList ? displayedList.length : 0;

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-sm dark:shadow-xl dark:shadow-indigo-950/20 space-y-5">
      {/* Toast Feedback */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/40 text-xs font-mono text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex flex-col">
              <span className="font-semibold">{successToast.message}</span>
              {successToast.txHash && successToast.txHash !== "0x_already_anchored" && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${successToast.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 dark:text-emerald-400 underline font-bold text-[11px] mt-0.5 break-all"
                >
                  View on Sepolia Etherscan: {successToast.txHash} ↗
                </a>
              )}
            </div>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer font-bold self-start sm:self-auto">
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Verifiable Credentials Vault</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                Ethereum Sepolia Anchored
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              W3C-compliant digital credentials with on-chain cryptographic anchoring
            </p>
          </div>
        </div>

        {/* Tab Selector & Issue Button */}
        <div className="flex items-center gap-2">
          {isIssuer && (
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("received")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "received"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Received ({receivedCredentials ? receivedCredentials.length : 0})
              </button>
              <button
                onClick={() => setActiveTab("issued")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "issued"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Issued ({issuedCredentials ? issuedCredentials.length : 0})
              </button>
            </div>
          )}

          {isIssuer && (
            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Issue Credential</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {isAuthLoading || displayedList === undefined ? (
        <div className="py-12 text-center text-xs font-mono text-slate-500">
          Loading cryptographic credentials...
        </div>
      ) : countDisplay === 0 ? (
        <div className="py-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 shadow-xs">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            {activeTab === "received" ? "No credentials received yet." : "No credentials issued yet."}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed font-sans">
            {activeTab === "received"
              ? "Cryptographically signed credentials issued to your DID by accredited authorities will appear here."
              : "As an authorized issuer, you can issue real W3C Verifiable Credentials to any registered DID."}
          </p>
          {isIssuer && activeTab === "issued" && (
            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
            >
              Issue First Credential &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedList.map((cred) => {
            const typeName = cred.type.find((t) => t !== "VerifiableCredential") || "VerifiableCredential";
            const issuedDate = new Date(cred.issuedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const expDate = cred.expirationDate
              ? new Date(cred.expirationDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Indefinite";

            const claimsData = cred.credentialData && typeof cred.credentialData === "object"
              ? Object.entries(cred.credentialData)
              : [];

            const isAnchored = cred.blockchainAnchorStatus === "ANCHORED";
            const isPending = cred.blockchainAnchorStatus === "PENDING" || anchoringId === cred._id;
            const isFailed = cred.blockchainAnchorStatus === "FAILED";

            return (
              <div
                key={cred._id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/40 transition-all shadow-xs flex flex-col justify-between space-y-4"
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 mb-1">
                        {typeName}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {cred.issuerName}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          cred.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                        }`}
                      >
                        {cred.status}
                      </span>
                    </div>
                  </div>

                  {/* Claims Attributes Grid */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-xs font-mono">
                    {claimsData.slice(0, 4).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center gap-2">
                        <span className="text-slate-500 text-[11px] truncate">{k}:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-semibold truncate">
                          {String(v)}
                        </span>
                      </div>
                    ))}
                    {claimsData.length > 4 && (
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        +{claimsData.length - 4} more attributes
                      </span>
                    )}
                  </div>
                </div>

                {/* Blockchain Anchor Status Box */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex flex-col gap-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 uppercase text-[10px] font-bold flex items-center gap-1">
                      <span>Ethereum Sepolia Anchor</span>
                    </span>
                    {isAnchored ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Anchored</span>
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        <span>Anchoring...</span>
                      </span>
                    ) : isFailed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40">
                        <span>Failed</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal">
                        Off-Chain
                      </span>
                    )}
                  </div>

                  {isAnchored && cred.blockchainTxHash && (
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-slate-500">Tx:</span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${cred.blockchainTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-cyan-400 hover:underline truncate max-w-[170px]"
                        title={cred.blockchainTxHash}
                      >
                        {cred.blockchainTxHash} ↗
                      </a>
                    </div>
                  )}

                  {isFailed && cred.blockchainFailureReason && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 truncate" title={cred.blockchainFailureReason}>
                      Error: {cred.blockchainFailureReason}
                    </span>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>Issued: {issuedDate}</span>
                    <span>Expires: {expDate}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => handleInspectVc(cred)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>Inspect W3C VC</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* Anchor / Retry Anchor Button for Issuers & Admins */}
                      {isIssuer && activeTab === "issued" && (!isAnchored || isFailed) && (
                        <button
                          onClick={() => handleAnchorToSepolia(cred)}
                          disabled={isPending}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          {isPending ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              <span>Anchoring...</span>
                            </>
                          ) : (
                            <>
                              <span>Ξ</span>
                              <span>{isFailed ? "Retry Anchor" : "Anchor to Sepolia"}</span>
                            </>
                          )}
                        </button>
                      )}

                      {isIssuer && activeTab === "issued" && cred.status === "active" && (
                        <button
                          onClick={() => handleRevoke(cred._id, typeName)}
                          disabled={revokingId === cred._id}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {revokingId === cred._id ? "Revoking..." : "Revoke"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isIssuer && (
        <IssueCredentialModal
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          onSuccess={() => {
            setSuccessToast({ message: "Verifiable Credential successfully signed and issued!" });
            setTimeout(() => setSuccessToast(null), 5000);
          }}
        />
      )}

      <CredentialViewerModal
        isOpen={viewingVc.isOpen}
        onClose={() => setViewingVc((prev) => ({ ...prev, isOpen: false }))}
        rawVcJson={viewingVc.rawVcJson}
        credentialId={viewingVc.credentialId}
        typeName={viewingVc.typeName}
        issuerName={viewingVc.issuerName}
        recipientDid={viewingVc.recipientDid}
        status={viewingVc.status}
      />
    </div>
  );
}
