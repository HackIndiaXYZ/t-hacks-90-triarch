"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

export function PasskeysCard() {
  const passkeys = useQuery(api.passkeys.getUserPasskeys);
  const deletePasskeyMutation = useMutation(api.passkeys.deletePasskey);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreatePasskey = async () => {
    setIsRegistering(true);
    setStatusMessage(null);

    try {
      // 1. Fetch registration options from server
      const optRes = await fetch("/api/webauthn/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!optRes.ok) {
        const errData = await optRes.json();
        throw new Error(errData.error || "Failed to generate passkey options.");
      }

      const options = await optRes.json();

      // 2. Invoke native browser WebAuthn API (Touch ID / Face ID / Windows Hello / YubiKey)
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: options });
      } catch (clientErr: unknown) {
        const error = clientErr as { name?: string; message?: string };
        if (error.name === "NotAllowedError" || error.name === "AbortError") {
          setStatusMessage({
            type: "info",
            text: "Passkey creation was cancelled.",
          });
          return;
        }
        throw new Error(error.message || "Native WebAuthn prompt failed or not supported.");
      }

      // 3. Send response to server for authoritative cryptographic verification
      const verifyRes = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationResponse: attResp,
          challenge: options.challenge,
          deviceName: navigator.userAgent.includes("Mac")
            ? "MacBook Touch ID / iCloud Keychain"
            : navigator.userAgent.includes("iPhone")
            ? "iPhone Face ID"
            : "Hardware Passkey Enclave",
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Server-side passkey verification failed.");
      }

      setStatusMessage({
        type: "success",
        text: "Passkey successfully created and bound to your TrustID account!",
      });
    } catch (err: unknown) {
      console.error("Passkey registration failed:", err);
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create passkey.",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleTestAuthentication = async () => {
    setIsTesting(true);
    setStatusMessage(null);

    try {
      // 1. Get authentication options
      const optRes = await fetch("/api/webauthn/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!optRes.ok) {
        throw new Error("Failed to get authentication options.");
      }

      const options = await optRes.json();

      // 2. Prompt device authenticator
      let asseResp;
      try {
        asseResp = await startAuthentication({ optionsJSON: options });
      } catch (clientErr: unknown) {
        const error = clientErr as { name?: string; message?: string };
        if (error.name === "NotAllowedError" || error.name === "AbortError") {
          setStatusMessage({
            type: "info",
            text: "Authentication prompt was cancelled.",
          });
          return;
        }
        throw new Error(error.message || "Authentication prompt failed.");
      }

      // 3. Verify authentication signature on server
      const verifyRes = await fetch("/api/webauthn/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authenticationResponse: asseResp,
          challenge: options.challenge,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Passkey verification failed.");
      }

      setStatusMessage({
        type: "success",
        text: `✓ Passkey Verified! Authenticated as ${verifyData.user?.email || "TrustID User"} via ${verifyData.user?.deviceName || "Hardware Enclave"}.`,
      });
    } catch (err: unknown) {
      console.error("Passkey test failed:", err);
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Passkey test failed.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async (passkeyId: Id<"passkeys">) => {
    if (!confirm("Are you sure you want to remove this passkey? You will not be able to authenticate with it anymore.")) {
      return;
    }

    setDeletingId(passkeyId);
    try {
      await deletePasskeyMutation({ passkeyId });
      setStatusMessage({
        type: "info",
        text: "Passkey removed from your account.",
      });
    } catch (err) {
      console.error("Failed to delete passkey:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const count = passkeys?.length || 0;

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md relative overflow-hidden space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-cyan-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Passkeys &amp; WebAuthn Biometrics</span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                FIDO2 / W3C Level 3
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sign in with Touch ID, Face ID, Windows Hello, or hardware security keys
            </p>
          </div>
        </div>

        {/* Create Passkey Button */}
        <button
          type="button"
          onClick={handleCreatePasskey}
          disabled={isRegistering}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          {isRegistering ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Prompting Device...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Passkey</span>
            </>
          )}
        </button>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-sans flex items-center gap-2.5 animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
              : statusMessage.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300"
              : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : statusMessage.type === "error" ? (
            <svg className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Passkeys List */}
      <div className="space-y-3">
        {passkeys === undefined ? (
          <div className="py-6 text-center text-xs font-mono text-slate-400">Loading registered passkeys...</div>
        ) : count === 0 ? (
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">No passkeys registered yet</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Click &quot;Create Passkey&quot; above to register Touch ID, Face ID, or a hardware security key for fast biometric authentication.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {passkeys.map((pk) => (
              <div
                key={pk._id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-cyan-400 flex items-center justify-center font-bold">
                    🔑
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{pk.deviceName || "Registered Passkey"}</span>
                      {pk.backedUp && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Synced Keychain
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate max-w-[260px]" title={pk.credentialId}>
                      ID: {pk.credentialId.slice(0, 20)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto text-[11px] font-mono text-slate-500">
                  <span>Created {new Date(pk.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(pk._id as Id<"passkeys">)}
                    disabled={deletingId === pk._id}
                    className="text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer disabled:opacity-40"
                  >
                    {deletingId === pk._id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Passkey Action & Privacy Guarantee */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {count > 0 && (
          <button
            type="button"
            onClick={handleTestAuthentication}
            disabled={isTesting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 self-start sm:self-auto"
          >
            {isTesting ? (
              <>
                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>Verifying Biometric...</span>
              </>
            ) : (
              <>
                <span>🔐</span>
                <span>Test Passkey Authentication</span>
              </>
            )}
          </button>
        )}

        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-tight">
          <strong>Biometric Privacy Guarantee:</strong> Face ID &amp; Touch ID biometric samples never leave your hardware enclave.
        </div>
      </div>
    </div>
  );
}
