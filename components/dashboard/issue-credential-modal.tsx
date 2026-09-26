"use client";

import React, { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { createAndSignVerifiableCredential } from "@/lib/crypto/vc-signer";
import { getKeyRecordByUserId } from "@/lib/crypto/keystore";
import { provisionUserDid } from "@/lib/crypto/did-service";

interface IssueCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CREDENTIAL_TEMPLATES = [
  {
    type: "EmploymentCredential",
    label: "Employment & Corporate Credential",
    defaultClaims: {
      employeeName: "",
      jobTitle: "Senior Protocol Engineer",
      department: "Engineering & Cryptography",
      employeeId: "EMP-" + Math.floor(1000 + Math.random() * 9000),
      employmentStatus: "Full-Time Active",
      clearanceLevel: "Level 4 (High)",
    },
  },
  {
    type: "AcademicDegreeCredential",
    label: "Academic Degree & Diploma",
    defaultClaims: {
      studentName: "",
      degree: "Bachelor of Science in Computer Science",
      institution: "Stanford University",
      gpa: "3.92",
      graduationYear: "2025",
      honors: "Magna Cum Laude",
    },
  },
  {
    type: "KycVerificationCredential",
    label: "KYC & Anti-Money Laundering Attestation",
    defaultClaims: {
      subjectName: "",
      kycTier: "Tier 3 Enhanced Due Diligence",
      jurisdiction: "United States (US)",
      verificationMethod: "Biometric Government ID Verification",
      riskScore: "Low (0.02)",
      complianceStatus: "PASSED",
    },
  },
  {
    type: "VerifiableIdCredential",
    label: "Government / National Digital ID",
    defaultClaims: {
      legalName: "",
      documentNumber: "DID-ID-" + Math.floor(100000 + Math.random() * 900000),
      nationality: "United States",
      dateOfBirth: "1996-03-31",
      issuingAuthority: "Verifi Digital Identity Authority",
    },
  },
  {
    type: "MembershipCredential",
    label: "Association / DAO Membership",
    defaultClaims: {
      memberName: "",
      membershipTier: "Founding Fellow",
      organization: "Verifi Governance Consortium",
      votingPower: "10,000 VOTE",
      activeSince: "2024",
    },
  },
  {
    type: "CustomCredential",
    label: "Custom Credential Schema",
    defaultClaims: {
      claimTitle: "Specialized Authorization",
      accessScope: "Production Infrastructure",
    },
  },
];

export function IssueCredentialModal({
  isOpen,
  onClose,
  onSuccess,
}: IssueCredentialModalProps) {
  const { user: clerkUser } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const issuerUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  const isIssuerOrAdmin =
    isAuthenticated && (issuerUser?.role === "issuer" || issuerUser?.role === "admin");

  const registeredRecipients = useQuery(
    api.credentials.getRegisteredRecipients,
    isOpen && isIssuerOrAdmin ? {} : "skip"
  );
  const issueMutation = useMutation(api.credentials.issueVerifiableCredential);
  const registerDidMutation = useMutation(api.users.registerUserDid);
  const recordAnchorPending = useMutation(api.blockchain.recordAnchorPending);
  const recordAnchorSuccess = useMutation(api.blockchain.recordAnchorSuccess);
  const recordAnchorFailure = useMutation(api.blockchain.recordAnchorFailure);

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [credentialType, setCredentialType] = useState(CREDENTIAL_TEMPLATES[0].type);
  const [autoAnchorSepolia, setAutoAnchorSepolia] = useState(true);
  const [recipientDid, setRecipientDid] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [issuerName, setIssuerName] = useState("");
  const [expirationPreset, setExpirationPreset] = useState<string>("1-year");
  const [claims, setClaims] = useState<Array<{ key: string; value: string }>>(() =>
    Object.entries(CREDENTIAL_TEMPLATES[0].defaultClaims).map(([k, v]) => ({
      key: k,
      value: String(v),
    }))
  );

  const [isSigning, setIsSigning] = useState(false);
  const [signingProgress, setSigningProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Switch template handler
  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    const template = CREDENTIAL_TEMPLATES[idx];
    if (template) {
      setCredentialType(template.type);
      const claimArray = Object.entries(template.defaultClaims).map(([k, v]) => ({
        key: k,
        value: String(v),
      }));
      setClaims(claimArray);
    }
  };

  // Handle selecting a recipient from the registered identities list
  const handleSelectRecipient = (recipientId: string) => {
    setSelectedRecipientId(recipientId);
    if (!recipientId) {
      setRecipientDid("");
      return;
    }
    const found = registeredRecipients?.find((r) => r._id === recipientId);
    if (found) {
      setRecipientDid(found.did);

      // Pre-fill name in claims if field exists
      const targetName = found.name || (found.username ? `@${found.username}` : found.email || "");
      setClaims((prev) =>
        prev.map((c) => {
          if (
            c.key === "employeeName" ||
            c.key === "studentName" ||
            c.key === "subjectName" ||
            c.key === "legalName" ||
            c.key === "memberName"
          ) {
            return { ...c, value: targetName };
          }
          return c;
        })
      );
    }
  };

  const handleClaimChange = (index: number, field: "key" | "value", val: string) => {
    setClaims((prev) => {
      const next = [...prev];
      next[index][field] = val;
      return next;
    });
  };

  const handleAddClaim = () => {
    setClaims((prev) => [...prev, { key: "newAttribute", value: "" }]);
  };

  const handleRemoveClaim = (index: number) => {
    setClaims((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen || !isIssuerOrAdmin) return null;

  const handleSignAndIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clerkUser) return;

    if (!recipientDid.trim() || !recipientDid.startsWith("did:key:")) {
      setErrorMsg("Valid recipient W3C did:key identifier is required.");
      return;
    }

    if (!issuerName.trim()) {
      setErrorMsg("Issuer authority name is required.");
      return;
    }

    setIsSigning(true);
    setErrorMsg(null);
    setSigningProgress("Accessing issuer Web Crypto signing enclave...");

    try {
      // 1. Ensure Issuer has a provisioned DID & private key in local IndexedDB
      let localKeyRecord = await getKeyRecordByUserId(clerkUser.id);
      let activeIssuerDid = issuerUser?.did || localKeyRecord?.did;

      if (!localKeyRecord || !activeIssuerDid) {
        setSigningProgress("Provisioning issuer cryptographic keypair in browser enclave...");
        const provisioned = await provisionUserDid(
          clerkUser.id,
          issuerUser?.did,
          async ({ did, publicKey, keyType }) => {
            await registerDidMutation({ did, publicKey, keyType });
          }
        );
        activeIssuerDid = provisioned.did;
        localKeyRecord = await getKeyRecordByUserId(clerkUser.id);
      }

      if (!localKeyRecord?.privateKey) {
        throw new Error("Unable to retrieve issuer private signing key from browser enclave.");
      }

      // 2. Compute Expiration Date
      const issuedAt = Date.now();
      let expirationDate: number | undefined = undefined;
      if (expirationPreset === "30-days") {
        expirationDate = issuedAt + 30 * 24 * 60 * 60 * 1000;
      } else if (expirationPreset === "90-days") {
        expirationDate = issuedAt + 90 * 24 * 60 * 60 * 1000;
      } else if (expirationPreset === "1-year") {
        expirationDate = issuedAt + 365 * 24 * 60 * 60 * 1000;
      } else if (expirationPreset === "2-years") {
        expirationDate = issuedAt + 730 * 24 * 60 * 60 * 1000;
      }

      // 3. Convert claims array to structured object
      const claimsObject: Record<string, unknown> = {};
      claims.forEach((c) => {
        if (c.key.trim()) {
          claimsObject[c.key.trim()] = c.value.trim();
        }
      });

      setSigningProgress("Computing SHA-256 digest and generating ECDSA P-256 cryptographic signature...");

      // 4. Create and cryptographically sign the W3C Verifiable Credential
      const finalIssuerName = (
        issuerName ||
        issuerUser?.name ||
        (issuerUser?.username ? `@${issuerUser.username}` : "Authorized Issuing Authority")
      ).trim();

      const { signedVc, rawVcJson, credentialId } = await createAndSignVerifiableCredential({
        credentialType,
        issuerDid: activeIssuerDid,
        issuerName: finalIssuerName,
        recipientDid: recipientDid.trim(),
        claims: claimsObject,
        issuedAt,
        expirationDate,
        privateKey: localKeyRecord.privateKey,
      });

      setSigningProgress("Recording signed credential in Convex...");

      // 5. Store signed credential in Convex
      const issueResult = await issueMutation({
        credentialId,
        type: signedVc.type,
        issuerDid: activeIssuerDid,
        issuerName: finalIssuerName,
        recipientDid: recipientDid.trim(),
        credentialData: claimsObject,
        issuedAt,
        expirationDate,
        rawVcJson,
        proof: signedVc.proof,
      });

      // 6. Anchor to Ethereum Sepolia if requested
      if (autoAnchorSepolia && issueResult?.credential?._id) {
        setSigningProgress("Anchoring cryptographic hash to Ethereum Sepolia blockchain...");
        const credDocId = issueResult.credential._id;
        try {
          await recordAnchorPending({
            credentialDocId: credDocId,
            credentialHash: "pending_hash_calculation",
            network: "sepolia",
            chainId: 11155111,
            contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xcd72712c39C5da6de61Ba40AF5EA69Bcd43185c5",
          });

          const anchorRes = await fetch("/api/blockchain/anchor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawVcJson }),
          });

          const anchorData = await anchorRes.json();
          if (anchorRes.ok && anchorData.success) {
            const resData = anchorData.data;
            await recordAnchorSuccess({
              credentialDocId: credDocId,
              credentialHash: resData.credentialHash,
              transactionHash: resData.transactionHash || "0x_already_anchored",
              blockNumber: resData.blockNumber || 0,
              anchoredAt: resData.anchoredAt || Date.now(),
              contractAddress: resData.contractAddress,
              network: resData.network || "sepolia",
              chainId: resData.chainId || 11155111,
            });
          } else {
            const failReason = anchorData?.error || "Failed to broadcast to Ethereum Sepolia";
            await recordAnchorFailure({
              credentialDocId: credDocId,
              failureReason: failReason,
            });
          }
        } catch (anchorErr) {
          console.warn("[Blockchain] Post-issuance anchor failed:", anchorErr);
          await recordAnchorFailure({
            credentialDocId: credDocId,
            failureReason: anchorErr instanceof Error ? anchorErr.message : String(anchorErr),
          });
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to issue credential:", err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSigning(false);
      setSigningProgress("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Issue Real Verifiable Credential
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                W3C cryptographic credential issuance with ECDSA P-256 digital signature
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSigning}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold p-1 cursor-pointer disabled:opacity-50"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSignAndIssue} className="flex-1 p-6 overflow-y-auto space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-mono flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {isSigning && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-center space-y-2 animate-pulse">
              <div className="w-7 h-7 border-2 border-indigo-500/30 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto" />
              <p className="font-mono text-xs text-indigo-900 dark:text-indigo-200 font-semibold">
                {signingProgress}
              </p>
            </div>
          )}

          {/* 1. Credential Template Picker */}
          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              1. Select Credential Schema Template:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CREDENTIAL_TEMPLATES.map((tmpl, idx) => (
                <button
                  type="button"
                  key={tmpl.type}
                  onClick={() => handleSelectTemplate(idx)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedTemplateIndex === idx
                      ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-500/60 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <span className="font-semibold text-slate-900 dark:text-white block text-[11px]">
                    {tmpl.label}
                  </span>
                  <span className="font-mono text-[10px] text-indigo-600 dark:text-cyan-400">
                    {tmpl.type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Recipient Selection */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <label className="block font-semibold text-slate-800 dark:text-slate-200">
              2. Target Recipient (Verified TrustID Identity with Real DID):
            </label>

            {registeredRecipients && registeredRecipients.length > 0 ? (
              <div>
                <select
                  value={selectedRecipientId}
                  onChange={(e) => handleSelectRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose from Registered Users with Real DIDs --</option>
                  {registeredRecipients.map((rec) => (
                    <option key={rec._id} value={rec._id}>
                      {rec.username ? `@${rec.username}` : rec.name || rec.email} ({rec.did.slice(0, 24)}...)
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                Recipient W3C did:key Identifier *
              </span>
              <input
                type="text"
                required
                placeholder="did:key:zDna..."
                value={recipientDid}
                onChange={(e) => setRecipientDid(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 3. Issuer Authority Name & Expiration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Issuing Authority Display Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Stanford University / Acme Corp"
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Validity &amp; Expiration
              </label>
              <select
                value={expirationPreset}
                onChange={(e) => setExpirationPreset(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="never">No Expiration (Indefinite)</option>
                <option value="30-days">30 Days</option>
                <option value="90-days">90 Days</option>
                <option value="1-year">1 Year</option>
                <option value="2-years">2 Years</option>
              </select>
            </div>
          </div>

          {/* 4. Claims Data Key-Value Editor */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 dark:text-slate-200">
                3. Credential Subject Claims (Data Payload):
              </label>
              <button
                type="button"
                onClick={handleAddClaim}
                className="text-[11px] font-semibold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>+ Add Claim Attribute</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {claims.map((claim, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Claim Name (e.g. title)"
                    value={claim.key}
                    onChange={(e) => handleClaimChange(idx, "key", e.target.value)}
                    className="w-1/3 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Senior Engineer)"
                    value={claim.value}
                    onChange={(e) => handleClaimChange(idx, "value", e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-sans bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveClaim(idx)}
                    title="Remove Claim"
                    className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Real Blockchain Anchoring Option */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <input
                id="auto-anchor-checkbox"
                type="checkbox"
                checked={autoAnchorSepolia}
                onChange={(e) => setAutoAnchorSepolia(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
              />
              <label htmlFor="auto-anchor-checkbox" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1.5">
                <span>Anchor Hash to Ethereum Sepolia Testnet</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Chain 11155111
                </span>
              </label>
            </div>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              Immutable on-chain timestamp
            </span>
          </div>

          {/* Cryptographic Signing Info Note */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/20 text-indigo-900 dark:text-indigo-200 leading-relaxed font-sans text-[11px]">
            <strong>Cryptographic Guarantee:</strong> Clicking &quot;Sign &amp; Issue Credential&quot; will compute a SHA-256 digest of this claim payload and digitally sign it with your browser enclave&apos;s ECDSA P-256 private key. The resulting W3C Verifiable Credential will be permanently attributed to your issuer DID.
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSigning}
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isSigning}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSigning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing Credential...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Sign &amp; Issue Credential</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
