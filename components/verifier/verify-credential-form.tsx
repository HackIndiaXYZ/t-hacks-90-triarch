"use client";

import React, { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { VerificationReport, VerificationResultCard } from "./verification-result-card";
import { CredentialViewerModal } from "@/components/dashboard/credential-viewer-modal";

interface ParsedCredentialInfo {
  typeName: string;
  issuerName: string;
  issuerDid: string;
  recipientLabel: string;
  recipientDid: string;
  issuedAtFormatted: string;
  expirationFormatted: string;
  status: "active" | "revoked";
  claims: Record<string, unknown>;
  rawVcJson: string;
  credentialId: string;
}

function extractCredentialInfo(
  credDoc: {
    _id: string;
    credentialId: string;
    type: string[];
    issuerDid: string;
    issuerName: string;
    recipientDid: string;
    credentialData?: unknown;
    rawVcJson: string;
    issuedAt: number;
    expirationDate?: string | number;
    status: "active" | "revoked";
    recipientUser?: { name?: string; username?: string; email?: string } | null;
  } | null,
  rawJsonInput: string
): ParsedCredentialInfo | null {
  if (credDoc) {
    let claims: Record<string, unknown> = {};
    if (typeof credDoc.credentialData === "object" && credDoc.credentialData !== null) {
      claims = credDoc.credentialData as Record<string, unknown>;
    } else if (typeof credDoc.credentialData === "string") {
      try {
        claims = JSON.parse(credDoc.credentialData);
      } catch {}
    } else {
      try {
        const raw = JSON.parse(credDoc.rawVcJson);
        if (raw?.credentialSubject) {
          const subjectCopy = { ...raw.credentialSubject };
          delete subjectCopy.id;
          claims = subjectCopy;
        }
      } catch {}
    }

    const typeName =
      credDoc.type.find((t) => t !== "VerifiableCredential") || "VerifiableCredential";

    const recipientLabel =
      credDoc.recipientUser?.name ||
      (credDoc.recipientUser?.username ? `@${credDoc.recipientUser.username}` : "Holder");

    return {
      typeName,
      issuerName: credDoc.issuerName,
      issuerDid: credDoc.issuerDid,
      recipientLabel,
      recipientDid: credDoc.recipientDid,
      issuedAtFormatted: new Date(credDoc.issuedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      expirationFormatted: credDoc.expirationDate
        ? new Date(credDoc.expirationDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "Indefinite / No Expiration",
      status: credDoc.status,
      claims,
      rawVcJson: credDoc.rawVcJson,
      credentialId: credDoc.credentialId,
    };
  }

  if (rawJsonInput.trim()) {
    try {
      const parsed = JSON.parse(rawJsonInput);
      const types = Array.isArray(parsed.type) ? parsed.type : ["VerifiableCredential"];
      const typeName = types.find((t: string) => t !== "VerifiableCredential") || "VerifiableCredential";

      let issuerName = "Custom / External Issuer";
      let issuerDid = "";
      if (typeof parsed.issuer === "object" && parsed.issuer !== null) {
        issuerName = parsed.issuer.name || "Custom Issuer";
        issuerDid = parsed.issuer.id || "";
      } else if (typeof parsed.issuer === "string") {
        issuerDid = parsed.issuer;
      }

      let recipientDid = "";
      let claims: Record<string, unknown> = {};
      if (parsed.credentialSubject && typeof parsed.credentialSubject === "object") {
        recipientDid = parsed.credentialSubject.id || "";
        const subjectCopy = { ...parsed.credentialSubject };
        delete subjectCopy.id;
        claims = subjectCopy;
      }

      return {
        typeName,
        issuerName,
        issuerDid,
        recipientLabel: "Credential Holder",
        recipientDid,
        issuedAtFormatted: parsed.issuanceDate
          ? new Date(parsed.issuanceDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "N/A",
        expirationFormatted: parsed.expirationDate
          ? new Date(parsed.expirationDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "Indefinite / No Expiration",
        status: "active",
        claims,
        rawVcJson: rawJsonInput,
        credentialId: parsed.id || "urn:uuid:custom",
      };
    } catch {}
  }

  return null;
}

export function VerifyCredentialForm() {
  const { isAuthenticated } = useConvexAuth();
  const availableCredentials = useQuery(
    api.verifications.getAvailableCredentialsForVerifier,
    isAuthenticated ? {} : "skip"
  );
  const history = useQuery(
    api.verifications.getVerificationHistory,
    isAuthenticated ? { limit: 50 } : "skip"
  );
  const verifyMutation = useMutation(api.verifications.verifyVerifiableCredential);

  const [inputMode, setInputMode] = useState<"select" | "qr" | "raw">("select");
  const [selectedCredDocId, setSelectedCredDocId] = useState<string>("");
  const [rawJsonInput, setRawJsonInput] = useState<string>("");
  const [qrTokenInput, setQrTokenInput] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifiedReportsByCred, setVerifiedReportsByCred] = useState<Record<string, VerificationReport>>({});
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  const verifyQrMutation = useMutation(api.qr.resolveAndVerifyQrToken);

  // Derive active selection for primary platform credentials
  const effectiveDocId =
    selectedCredDocId ||
    (inputMode === "select" && availableCredentials && availableCredentials.length > 0
      ? availableCredentials[0]._id
      : "");

  const selectedDoc =
    inputMode === "select" && availableCredentials
      ? availableCredentials.find((c) => c._id === effectiveDocId) || null
      : null;

  const effectiveRawJson =
    inputMode === "raw" ? rawJsonInput : selectedDoc ? selectedDoc.rawVcJson : "";

  const credentialCardInfo = extractCredentialInfo(selectedDoc, effectiveRawJson);

  // Key used to identify verification state for the currently active credential
  const currentCredKey =
    inputMode === "select"
      ? effectiveDocId
      : inputMode === "qr"
      ? (qrTokenInput.includes("/verify/qr/")
          ? qrTokenInput.split("/verify/qr/")[1].split("?")[0].split("#")[0]
          : qrTokenInput).trim()
      : credentialCardInfo?.credentialId || rawJsonInput.trim();

  // Find latest authoritative audit log from Convex for this credential (if already verified previously)
  const latestAuditForCred = history?.find(
    (h) =>
      (inputMode === "select" && effectiveDocId && h.credentialDocId === effectiveDocId) ||
      (credentialCardInfo?.credentialId && h.credentialId === credentialCardInfo.credentialId)
  );

  const historicalReport: VerificationReport | null = latestAuditForCred
    ? {
        verificationId: latestAuditForCred._id,
        result: latestAuditForCred.result,
        credentialId: latestAuditForCred.credentialId,
        credentialType: latestAuditForCred.credentialType,
        issuer: {
          did: latestAuditForCred.issuerDid,
          name: latestAuditForCred.issuerName,
        },
        subjectDid: latestAuditForCred.recipientDid,
        issuanceDate: credentialCardInfo?.issuedAtFormatted || null,
        expirationDate: credentialCardInfo?.expirationFormatted || null,
        claims:
          credentialCardInfo?.claims && Object.keys(credentialCardInfo.claims).length > 0
            ? credentialCardInfo.claims
            : (latestAuditForCred.claimsSummary as Record<string, unknown>) || {},
        signatureValid: latestAuditForCred.signatureValid,
        integrityValid: latestAuditForCred.integrityValid,
        statusValid: latestAuditForCred.statusValid,
        expirationValid: latestAuditForCred.expirationValid,
        failureReason: latestAuditForCred.failureReason,
        blockchain: {
          anchored: latestAuditForCred.blockchainAnchored ?? (selectedDoc?.blockchainAnchorStatus === "ANCHORED"),
          credentialHash: latestAuditForCred.blockchainCredentialHash || selectedDoc?.blockchainCredentialHash,
          contractAddress: latestAuditForCred.blockchainContractAddress || selectedDoc?.blockchainContractAddress || "0xcd72712c39C5da6de61Ba40AF5EA69Bcd43185c5",
          txHash: latestAuditForCred.blockchainTxHash || selectedDoc?.blockchainTxHash,
          blockNumber: latestAuditForCred.blockchainBlockNumber || selectedDoc?.blockchainBlockNumber,
          network: latestAuditForCred.blockchainNetwork || selectedDoc?.blockchainNetwork || "sepolia",
          anchoredAt: latestAuditForCred.blockchainAnchoredAt || selectedDoc?.blockchainAnchoredAt,
        },
        verifiedAt: latestAuditForCred.verifiedAt,
        verifier: {
          id: latestAuditForCred.verifierUserId,
          name: "Authorized Verifier",
          role: latestAuditForCred.verifierRole,
        },
      }
    : null;

  // Active verified report for the currently selected credential
  const activeReport: VerificationReport | null =
    verifiedReportsByCred[currentCredKey] || historicalReport || null;

  const handleSelectCredential = (docId: string) => {
    setSelectedCredDocId(docId);
    setErrorMsg(null);
  };

  const handleModeChange = (mode: "select" | "qr" | "raw") => {
    setInputMode(mode);
    setErrorMsg(null);
  };

  const handleRawJsonChange = (val: string) => {
    setRawJsonInput(val);
    setSelectedCredDocId("");
    setErrorMsg(null);
  };

  const handleVerifyQr = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying) return;

    let cleanToken = qrTokenInput.trim();
    if (!cleanToken) {
      setErrorMsg("Please enter a valid QR verification token or verification URL.");
      return;
    }

    if (cleanToken.includes("/verify/qr/")) {
      cleanToken = cleanToken.split("/verify/qr/")[1].split("?")[0].split("#")[0];
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await verifyQrMutation({ token: cleanToken });
      if (!res.success || !res.credential) {
        setErrorMsg(res.error || "QR token verification failed.");
        return;
      }

      const qrReport: VerificationReport = {
        verificationId: `qr_${cleanToken.slice(0, 8)}`,
        result: res.result,
        credentialId: res.credential.credentialId,
        credentialType: res.credential.type,
        issuer: {
          did: res.credential.issuerDid,
          name: res.credential.issuerName,
        },
        subjectDid: res.credential.recipientDid,
        issuanceDate: new Date(res.credential.issuedAt).toLocaleDateString(),
        expirationDate: res.credential.expirationDate
          ? new Date(res.credential.expirationDate).toLocaleDateString()
          : null,
        claims: (res.credential.claims as Record<string, unknown>) || {},
        signatureValid: res.verificationDetails?.signatureValid ?? false,
        integrityValid: res.verificationDetails?.integrityValid ?? false,
        statusValid: res.verificationDetails?.statusValid ?? false,
        expirationValid: res.verificationDetails?.expirationValid ?? false,
        failureReason: res.failureReason,
        blockchain: {
          anchored: res.blockchain?.isAnchored ?? false,
          credentialHash: undefined,
          contractAddress: res.blockchain?.contractAddress,
          txHash: res.blockchain?.txHash,
          blockNumber: res.blockchain?.blockNumber,
          network: res.blockchain?.network || "sepolia",
          anchoredAt: res.blockchain?.anchoredAt,
        },
        verifiedAt: res.verifiedAt ?? 0,
        verifier: {
          id: "qr_verifier",
          name: "TrustID QR Enclave Verifier",
          role: "verifier",
        },
      };

      setVerifiedReportsByCred((prev) => ({
        ...prev,
        [cleanToken]: qrReport,
      }));
    } catch (err: unknown) {
      console.error("QR Verification failed:", err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputMode === "qr") {
      return handleVerifyQr(e);
    }
    if (isVerifying) return; // Prevent duplicate execution
    if (!effectiveRawJson.trim()) {
      setErrorMsg("Please select a credential or provide a valid W3C JSON-LD credential document.");
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      // 1. Query on-chain Sepolia smart contract for real anchor status
      let blockchainVerificationResult = undefined;
      try {
        const bRes = await fetch("/api/blockchain/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawVcJson: effectiveRawJson.trim() }),
        });
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData.data) {
            blockchainVerificationResult = {
              isAnchored: bData.data.isAnchored,
              credentialHash: bData.data.credentialHash,
              contractAddress: bData.data.contractAddress,
              network: bData.data.network,
              chainId: bData.data.chainId,
              anchoredAt: bData.data.anchoredAt,
              anchoredBy: bData.data.anchoredBy,
              txHash: selectedDoc?.blockchainTxHash,
              blockNumber: selectedDoc?.blockchainBlockNumber,
            };
          }
        }
      } catch (bErr) {
        console.warn("[Verifier] Sepolia anchor query error:", bErr);
      }

      // 2. Execute authoritative backend verification in Convex
      const docId = inputMode === "select" && effectiveDocId ? (effectiveDocId as Id<"credentials">) : undefined;
      const result = await verifyMutation({
        rawVcJson: effectiveRawJson.trim(),
        credentialDocId: docId,
        blockchainVerification: blockchainVerificationResult,
      });

      // Immediate authoritative React state update mapped directly to this credential
      setVerifiedReportsByCred((prev) => ({
        ...prev,
        [currentCredKey]: result as VerificationReport,
      }));
    } catch (err: unknown) {
      console.error("Verification failed:", err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    if (currentCredKey) {
      setVerifiedReportsByCred((prev) => {
        const next = { ...prev };
        delete next[currentCredKey];
        return next;
      });
    }
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Primary Verifier Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Card Header & Flow Switcher */}
        <div className="p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {inputMode === "select"
                  ? "Platform Credential Verification"
                  : inputMode === "qr"
                  ? "QR Token & URL Verification"
                  : "Advanced W3C JSON-LD Verification"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {inputMode === "select"
                ? "Inspect platform-issued credentials and trigger server-side cryptographic proof verification"
                : inputMode === "qr"
                ? "Verify a credential shared via QR code token or TrustID verification URL"
                : "Paste external or raw W3C Verifiable Credentials to verify cryptographic signatures and integrity"}
            </p>
          </div>

          {/* Clean 3-Way Mode Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleModeChange("select")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                inputMode === "select"
                  ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Platform Credentials
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("qr")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                inputMode === "qr"
                  ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Scan / QR Token</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("raw")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                inputMode === "raw"
                  ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Raw JSON
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="m-6 mb-0 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 font-sans flex items-center gap-3">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        <div className="p-6 sm:p-7 space-y-6">
          {/* PRIMARY FLOW: Platform Credential Dropdown */}
          {inputMode === "select" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Platform Credential:
              </label>

              {availableCredentials === undefined ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-500 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
                  <span>Loading platform credentials...</span>
                </div>
              ) : availableCredentials.length === 0 ? (
                <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-bold block mb-0.5">No Platform Credentials Found</span>
                    <span>Use an authorized Issuer account on the dashboard to issue a real credential first, or click &quot;Advanced: Paste Raw JSON&quot; above.</span>
                  </div>
                </div>
              ) : (
                <select
                  value={effectiveDocId}
                  onChange={(e) => handleSelectCredential(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-sans cursor-pointer transition-all shadow-xs"
                >
                  {availableCredentials.map((c) => {
                    const typeName =
                      c.type.find((t) => t !== "VerifiableCredential") || "VerifiableCredential";
                    const recipientLabel =
                      c.recipientUser?.name ||
                      (c.recipientUser?.username ? `@${c.recipientUser.username}` : c.recipientDid.slice(0, 16));
                    return (
                      <option key={c._id} value={c._id}>
                        {typeName} — Issued by {c.issuerName} to {recipientLabel} [{c.status.toUpperCase()}]
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          {/* QR TOKEN VERIFICATION FLOW */}
          {inputMode === "qr" && (
            <div className="space-y-4 p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Enter QR Verification Token or Scanned URL</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      QR / Scan
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Paste the 64-character verification token or the full QR verification link shared by the credential holder.
                  </p>
                </div>
                {qrTokenInput && (
                  <button
                    type="button"
                    onClick={() => setQrTokenInput("")}
                    className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  >
                    Clear Input
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                  placeholder="e.g. 5d9a7f34c2b1... or https://.../verify/qr/5d9a7f34c2b1..."
                  className="flex-1 px-4 py-3 rounded-xl font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleVerifyQr}
                  disabled={isVerifying || !qrTokenInput.trim()}
                  className="px-5 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Resolving Token...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Verify QR Token</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ADVANCED FLOW: Raw JSON Textarea (Hidden by default, shown ONLY when mode is 'raw') */}
          {inputMode === "raw" && (
            <div className="space-y-3 p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-indigo-100 dark:border-indigo-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Paste W3C Verifiable Credential JSON Document</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                      Advanced
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Paste any signed W3C JSON-LD credential payload with proof.
                  </p>
                </div>
                {rawJsonInput && (
                  <button
                    type="button"
                    onClick={() => handleRawJsonChange("")}
                    className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  >
                    Clear Input
                  </button>
                )}
              </div>
              <textarea
                rows={7}
                value={rawJsonInput}
                onChange={(e) => handleRawJsonChange(e.target.value)}
                placeholder='{\n  "@context": ["https://www.w3.org/2018/credentials/v1"],\n  "id": "urn:uuid:...",\n  "type": ["VerifiableCredential", "AcademicDegreeCredential"],\n  "issuer": { "id": "did:key:z...", "name": "Stanford University" },\n  "credentialSubject": { "degree": "Master of Science" },\n  "proof": { "jws": "..." }\n}'
                className="w-full p-4 rounded-xl font-mono text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed shadow-2xs"
              />
            </div>
          )}

          {/* Clean Professional Selected Credential Presentation Card */}
          {credentialCardInfo && (
            <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-950/80 dark:to-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
              {/* Card Top: Type & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 font-bold block">
                      W3C Verifiable Credential
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {credentialCardInfo.typeName}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                      credentialCardInfo.status === "active"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        credentialCardInfo.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span>{credentialCardInfo.status}</span>
                  </span>
                </div>
              </div>

              {/* Parties Grid: Holder & Issuer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Issuer Box */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-2xs">
                  <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Issuing Authority
                  </span>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {credentialCardInfo.issuerName}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate" title={credentialCardInfo.issuerDid}>
                    DID: <span className="text-slate-700 dark:text-slate-300">{credentialCardInfo.issuerDid || "Embedded in proof"}</span>
                  </div>
                </div>

                {/* Holder Box */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-2xs">
                  <span className="text-[10px] font-mono uppercase font-bold text-sky-600 dark:text-cyan-400 tracking-wider">
                    Holder / Recipient
                  </span>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {credentialCardInfo.recipientLabel}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate" title={credentialCardInfo.recipientDid}>
                    DID: <span className="text-slate-700 dark:text-slate-300">{credentialCardInfo.recipientDid || "Embedded in subject"}</span>
                  </div>
                </div>
              </div>

              {/* Credential Claims Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
                  Credential Claims &amp; Attributes
                </span>

                {Object.keys(credentialCardInfo.claims).length === 0 ? (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400 font-mono">
                    No custom claim attributes specified in document subject.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 font-mono text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold w-1/3">Attribute</th>
                          <th className="py-2.5 px-4 font-semibold">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {Object.entries(credentialCardInfo.claims).map(([key, val]) => (
                          <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                            <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400 capitalize">
                              {key.replace(/([A-Z])/g, " $1")}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white font-sans">
                              {String(val)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-500">Issued Date:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {credentialCardInfo.issuedAtFormatted}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-500">Expiration Date:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {credentialCardInfo.expirationFormatted}
                  </span>
                </div>
              </div>

              {/* Action Toolbar & Persisted Verification State */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                {/* Secondary Button: Inspect W3C Credential Modal */}
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>Inspect W3C Credential</span>
                </button>

                {/* Verification Result Badge vs Trigger Button */}
                {activeReport ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Persisted Result Badge */}
                    <div
                      className={`px-4 py-2.5 rounded-xl flex items-center gap-3 border shadow-sm ${
                        activeReport.result === "VERIFIED"
                          ? "bg-emerald-50/90 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
                          : activeReport.result === "REVOKED"
                          ? "bg-rose-50/90 dark:bg-rose-950/70 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200"
                          : activeReport.result === "EXPIRED"
                          ? "bg-amber-50/90 dark:bg-amber-950/70 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200"
                          : "bg-red-50/90 dark:bg-red-950/70 border-red-300 dark:border-red-500/40 text-red-900 dark:text-red-200"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-white shrink-0 ${
                          activeReport.result === "VERIFIED"
                            ? "bg-emerald-600 shadow-xs"
                            : activeReport.result === "REVOKED"
                            ? "bg-rose-600 shadow-xs"
                            : activeReport.result === "EXPIRED"
                            ? "bg-amber-600 shadow-xs"
                            : "bg-red-600 shadow-xs"
                        }`}
                      >
                        {activeReport.result === "VERIFIED" ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : activeReport.result === "REVOKED" ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" />
                          </svg>
                        ) : activeReport.result === "EXPIRED" ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>

                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-xs tracking-wider flex items-center gap-1.5">
                          <span>✓ {activeReport.result}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/60 dark:bg-black/30 border border-current font-normal opacity-80">
                            Recorded
                          </span>
                        </span>
                        <span className="text-[10px] opacity-90 font-medium">
                          {activeReport.result === "VERIFIED"
                            ? "Cryptographic verification successful"
                            : activeReport.result === "REVOKED"
                            ? "Credential revoked by issuer"
                            : activeReport.result === "EXPIRED"
                            ? "Credential validity has expired"
                            : "Cryptographic verification failed"}
                        </span>
                      </div>
                    </div>

                    {/* Secondary Re-verify Button */}
                    <button
                      type="button"
                      onClick={() => handleVerify()}
                      disabled={isVerifying}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                      title="Run fresh cryptographic verification check"
                    >
                      {isVerifying ? "Verifying..." : "Re-verify"}
                    </button>
                  </div>
                ) : (
                  /* Primary Trigger Button: Shown only when unverified */
                  <Button
                    type="button"
                    onClick={() => handleVerify()}
                    disabled={isVerifying || !effectiveRawJson.trim()}
                    className="min-w-[240px] justify-center text-xs font-bold py-3 rounded-xl shadow-md cursor-pointer bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Verify Credential Authenticity</span>
                      </div>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Detailed Verification Audit Report (7-Point Matrix, Claims, Convex Audit ID) */}
      {activeReport && (
        <VerificationResultCard report={activeReport} onReset={handleReset} />
      )}

      {/* 3. W3C JSON-LD Modal Inspector */}
      {credentialCardInfo && (
        <CredentialViewerModal
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          rawVcJson={credentialCardInfo.rawVcJson}
          credentialId={credentialCardInfo.credentialId}
          typeName={credentialCardInfo.typeName}
          issuerName={credentialCardInfo.issuerName}
          recipientDid={credentialCardInfo.recipientDid}
          status={credentialCardInfo.status}
        />
      )}
    </div>
  );
}
