"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";

export function PasskeySignInButton() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const handlePasskeySignIn = async () => {
    setIsAuthenticating(true);
    setStatusMessage(null);

    try {
      // 1. Fetch authentication options from backend
      const optRes = await fetch("/api/webauthn/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!optRes.ok) {
        let errorText = "Failed to get authentication options.";
        try {
          const errData = await optRes.json();
          if (errData?.error) errorText = errData.error;
        } catch {}
        throw new Error(errorText);
      }

      const options = await optRes.json();

      // 2. Prompt native browser WebAuthn / Passkey authenticator
      let asseResp;
      try {
        asseResp = await startAuthentication({ optionsJSON: options });
      } catch (clientErr: unknown) {
        const error = clientErr as { name?: string; message?: string };
        if (error.name === "NotAllowedError" || error.name === "AbortError") {
          setStatusMessage({
            type: "info",
            text: "Passkey sign-in was cancelled.",
          });
          return;
        }
        throw new Error(error.message || "Passkey prompt failed.");
      }

      // 3. Verify authentication signature cryptographically on server
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
        throw new Error(verifyData.error || "Passkey authentication failed.");
      }

      const userName = verifyData.user?.name || verifyData.user?.email || "TrustID User";
      setStatusMessage({
        type: "success",
        text: `✓ Authenticated as ${userName} via Passkey! Redirecting...`,
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (err: unknown) {
      console.error("Passkey sign-in error:", err);
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Passkey authentication failed.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={handlePasskeySignIn}
        disabled={isAuthenticating}
        className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-800 dark:text-white bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/40 transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
      >
        {isAuthenticating ? (
          <>
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Scanning Biometric / Passkey...</span>
          </>
        ) : (
          <>
            <span className="text-base">🔑</span>
            <span>Sign in with Passkey / Biometrics</span>
          </>
        )}
      </button>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-sans text-center animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : statusMessage.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          }`}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
