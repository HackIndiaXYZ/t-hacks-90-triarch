"use client";

import React, { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

interface QrShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentialDocId: Id<"credentials">;
  credentialTitle: string;
  credentialId: string;
  issuerName: string;
}

export function QrShareModal({
  isOpen,
  onClose,
  credentialDocId,
  credentialTitle,
  issuerName,
}: QrShareModalProps) {
  const createQrTokenMutation = useMutation(api.qr.createQrShareToken);
  const revokeQrTokenMutation = useMutation(api.qr.revokeQrShareToken);

  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    if (!isOpen) {
      return;
    }

    async function fetchQr() {
      setIsGenerating(true);
      setErrorMsg(null);
      setCopied(false);

      try {
        const res = await createQrTokenMutation({
          credentialDocId,
          durationMinutes,
        });

        if (!isMounted) return;
        setToken(res.token);
        setExpiresAt(res.expiresAt);

        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const fullVerifyUrl = `${origin}/verify/qr/${res.token}`;
        setVerifyUrl(fullVerifyUrl);

        const dataUrl = await QRCode.toDataURL(fullVerifyUrl, {
          width: 380,
          margin: 2,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        });

        if (!isMounted) return;
        setQrDataUrl(dataUrl);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error("Failed to generate QR share token:", err);
        setErrorMsg(err instanceof Error ? err.message : "Failed to generate QR code.");
      } finally {
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    }

    fetchQr();

    return () => {
      isMounted = false;
    };
  }, [isOpen, durationMinutes, credentialDocId, createQrTokenMutation]);

  // Expiration countdown
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${mins}m ${secs.toString().padStart(2, "0")}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyLink = async () => {
    if (!verifyUrl) return;
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `verifi-qr-${credentialTitle.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const handleRevoke = async () => {
    if (!token) return;
    if (!confirm("Are you sure you want to revoke this QR code? Verifiers will immediately lose access.")) return;

    setRevoking(true);
    try {
      await revokeQrTokenMutation({ token });
      setToken(null);
      setQrDataUrl(null);
      setExpiresAt(null);
      setErrorMsg("QR code has been revoked.");
    } catch (err) {
      console.error("Failed to revoke QR token:", err);
    } finally {
      setRevoking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Share Credential via QR
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {credentialTitle} • {issuerName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 flex-1 flex flex-col items-center text-center">
          {/* Expiration Selector */}
          <div className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium pl-2">Validity Period:</span>
            <div className="flex gap-1">
              {[
                { label: "15 min", value: 15 },
                { label: "1 hour", value: 60 },
                { label: "24 hours", value: 1440 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDurationMinutes(opt.value)}
                  className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                    durationMinutes === opt.value
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="relative group">
            <div className="w-64 h-64 p-3 bg-white rounded-3xl border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-xl shadow-indigo-500/10 flex items-center justify-center relative overflow-hidden">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Generating secure QR...</span>
                </div>
              ) : qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Verifiable Credential Verification QR Code"
                  className="w-full h-full object-contain rounded-2xl"
                />
              ) : (
                <div className="text-xs text-rose-500 p-4">{errorMsg || "QR expired or revoked"}</div>
              )}
            </div>

            {/* Countdown Badge */}
            {expiresAt && timeLeft !== "Expired" && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900 dark:bg-slate-800 text-emerald-400 border border-slate-700 shadow-md text-[11px] font-mono flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Expires in: {timeLeft}</span>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/20 text-[11px] text-slate-600 dark:text-indigo-200 leading-relaxed text-left space-y-1">
            <div className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Zero-Exposure Privacy Guarantee</span>
            </div>
            <p>
              This QR code contains only a secure, short-lived verification token. Your raw documents, private keys, and personal data are never stored in the QR code.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!verifyUrl || isGenerating}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {copied ? (
                <>
                  <span className="text-emerald-600">✓ Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl || isGenerating}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download PNG</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={handleRevoke}
            disabled={!token || revoking}
            className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer disabled:opacity-40"
          >
            {revoking ? "Revoking..." : "Revoke QR Code"}
          </button>

          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
