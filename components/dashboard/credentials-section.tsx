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
  const [successToast, setSuccessToast] = useState<string | null>(null);

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
      setSuccessToast(`Credential '${credentialName}' has been revoked.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error("Failed to revoke credential:", err);
      alert(err instanceof Error ? err.message : "Failed to revoke credential.");
    } finally {
      setRevokingId(null);
    }
  };

  const displayedList = activeTab === "received" ? receivedCredentials : issuedCredentials;
  const countDisplay = displayedList ? displayedList.length : 0;

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-sm dark:shadow-xl dark:shadow-indigo-950/20 space-y-5">
      {/* Toast Feedback */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/40 text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer font-bold">
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
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 uppercase">
                W3C JSON-LD
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tamper-evident, cryptographically signed digital attestations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isIssuer && (
            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Issue Credential</span>
            </button>
          )}

          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            {countDisplay} Item{countDisplay !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Tabs for Issuers */}
      {isIssuer && (
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab("received")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "received"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            My Received Credentials ({receivedCredentials?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("issued")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "issued"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Issuer Console ({issuedCredentials?.length ?? 0})
          </button>
        </div>
      )}

      {/* Credentials List Body */}
      {isAuthLoading || displayedList === undefined ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs font-mono text-slate-500">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
          <span>Loading cryptographic credentials...</span>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="py-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-2 shadow-xs">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
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

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>Issued: {issuedDate}</span>
                    <span>Expires: {expDate}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleInspectVc(cred)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>Inspect W3C VC</span>
                    </button>

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
            setSuccessToast("Verifiable Credential successfully signed and issued!");
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
