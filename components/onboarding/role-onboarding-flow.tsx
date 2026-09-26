"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

type SelectedRole = "user" | "issuer" | "verifier";

export function RoleOnboardingFlow() {
  const router = useRouter();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();

  const isAuthReady = isClerkLoaded && !isConvexAuthLoading && isAuthenticated;

  const latestRequest = useQuery(
    api.roleRequests.getLatestRoleRequest,
    isAuthenticated ? {} : "skip"
  );
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  const completeUserOnboarding = useMutation(api.users.completeUserOnboarding);
  const submitRoleRequest = useMutation(api.roleRequests.submitRoleRequest);
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);

  // Auto-redirect privileged roles away from onboarding
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        router.replace("/admin");
      } else if (currentUser.role === "issuer" || currentUser.role === "verifier") {
        router.replace("/dashboard");
      }
    }
  }, [currentUser, router]);

  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);
  const [step, setStep] = useState<"select" | "form" | "submitted">("select");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("Enterprise / Corporation");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState(
    clerkUser?.primaryEmailAddress?.emailAddress || ""
  );
  const [useCase, setUseCase] = useState("");

  const handleSelectUser = async () => {
    if (!isAuthReady) {
      setErrorMsg("Authentication session is initializing. Please wait a moment and try again.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      // Ensure user record is synced with Clerk profile data first then marked completed
      await syncCurrentUser({
        username: clerkUser?.username || undefined,
        email: clerkUser?.primaryEmailAddress?.emailAddress || undefined,
        name: clerkUser?.fullName || undefined,
        imageUrl: clerkUser?.imageUrl || undefined,
      });
      await completeUserOnboarding();
      router.push("/dashboard");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setIsSubmitting(false);
    }
  };

  const handleSelectAuthorityRole = (role: "issuer" | "verifier") => {
    setSelectedRole(role);
    setStep("form");
    setErrorMsg(null);
    if (!contactEmail && clerkUser?.primaryEmailAddress?.emailAddress) {
      setContactEmail(clerkUser.primaryEmailAddress.emailAddress);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || selectedRole === "user") return;

    if (!orgName.trim()) {
      setErrorMsg("Organization / Entity name is required.");
      return;
    }
    if (!contactEmail.trim()) {
      setErrorMsg("Official contact email is required.");
      return;
    }
    if (!useCase.trim()) {
      setErrorMsg("Please provide a brief description of your intended use case.");
      return;
    }

    if (!isAuthReady) {
      setErrorMsg("Authentication session is initializing. Please wait a moment and try again.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await syncCurrentUser({
        username: clerkUser?.username || undefined,
        email: clerkUser?.primaryEmailAddress?.emailAddress || undefined,
        name: clerkUser?.fullName || undefined,
        imageUrl: clerkUser?.imageUrl || undefined,
      });
      await submitRoleRequest({
        requestedRole: selectedRole,
        organizationName: orgName.trim(),
        organizationType: orgType,
        website: website.trim() || undefined,
        contactEmail: contactEmail.trim(),
        useCaseDescription: useCase.trim(),
      });
      setStep("submitted");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentUser?.role === "admin" || currentUser?.role === "issuer" || currentUser?.role === "verifier") {
    return (
      <div className="w-full max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {currentUser.role === "admin" ? "Redirecting to Governance Console..." : "Redirecting to Dashboard..."}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Your account is already initialized with role: &apos;{currentUser.role}&apos;.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4">
      {/* Progress & Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 text-xs font-mono text-sky-700 dark:text-cyan-400 mb-3 shadow-xs">
          <span>Verifi Identity Network</span>
          <span>&middot;</span>
          <span>Role Initialization</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Select Your Account Role
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          Choose how you plan to interact with the Verifi verifiable credentials ecosystem.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 font-mono flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Existing Pending Request Notice */}
      {latestRequest && latestRequest.status === "pending" && step === "select" && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-sm">
                Active Pending Request: {latestRequest.requestedRole.toUpperCase()} Role
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Submitted for <span className="font-medium font-sans">{latestRequest.organizationName}</span> on{" "}
                {new Date(latestRequest.createdAt).toLocaleDateString()}. Your active role remains &quot;user&quot; while under review.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="shrink-0"
          >
            Go to Dashboard &rarr;
          </Button>
        </div>
      )}

      {/* STEP 1: Select Role Options */}
      {step === "select" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Individual User */}
          <div className="flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Individual User
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold">
                  Instant
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Hold your self-sovereign digital identity, receive verifiable credentials, and generate zero-knowledge privacy proofs.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans">
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">&check;</span> Personal DID Vault
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">&check;</span> Receive & Store Claims
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">&check;</span> Privacy-Preserving Proofs
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={handleSelectUser}
                disabled={isSubmitting || !isAuthReady}
                className="w-full justify-center"
              >
                {isSubmitting
                  ? "Setting Up..."
                  : !isAuthReady
                  ? "Initializing Session..."
                  : "Continue as User"}
              </Button>
            </div>
          </div>

          {/* 2. Issuer Organization */}
          <div className="flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Issuer Organization
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
                  Verification Req.
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Accredited institutions, universities, employers, and government entities authorized to sign and issue W3C credentials.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans">
                <li className="flex items-center gap-1.5">
                  <span className="text-indigo-500 font-bold">&bull;</span> Cryptographic Schema Signing
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-indigo-500 font-bold">&bull;</span> Batch Credential Issuance
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-indigo-500 font-bold">&bull;</span> On-Chain Revocation Lists
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                onClick={() => handleSelectAuthorityRole("issuer")}
                className="w-full justify-center"
              >
                Apply as Issuer &rarr;
              </Button>
            </div>
          </div>

          {/* 3. Verifier Relying Party */}
          <div className="flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Verifier / Relying Party
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
                  Verification Req.
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Platforms and services authorized to request cryptographic proof presentations and verify claims without receiving raw PII.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans">
                <li className="flex items-center gap-1.5">
                  <span className="text-cyan-500 font-bold">&bull;</span> Proof Request Templates
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-cyan-500 font-bold">&bull;</span> Instant ZK Verification
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-cyan-500 font-bold">&bull;</span> Real-Time Audit Trails
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                onClick={() => handleSelectAuthorityRole("verifier")}
                className="w-full justify-center"
              >
                Apply as Verifier &rarr;
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Onboarding Request Form (Issuer or Verifier) */}
      {step === "form" && selectedRole && (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-sky-600 dark:text-cyan-400 tracking-wider">
                {selectedRole === "issuer" ? "Issuer Access Request" : "Verifier Access Request"}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Organization &amp; Compliance Details
              </h2>
            </div>
            <button
              onClick={() => setStep("select")}
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              &larr; Back to roles
            </button>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Organization / Entity Name *
              </label>
              <input
                type="text"
                required
                placeholder={selectedRole === "issuer" ? "e.g. Stanford University / TechCorp ID Authority" : "e.g. Acme Financial Services"}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 dark:focus:ring-cyan-400 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Organization Type
                </label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 dark:focus:ring-cyan-400 transition-all"
                >
                  <option value="Enterprise / Corporation">Enterprise / Corporation</option>
                  <option value="Academic Institution">Academic Institution</option>
                  <option value="Government Agency">Government Agency</option>
                  <option value="Financial Institution">Financial Institution</option>
                  <option value="Healthcare Provider">Healthcare Provider</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Website
                </label>
                <input
                  type="url"
                  placeholder="https://example.org"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 dark:focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Contact Email *
              </label>
              <input
                type="email"
                required
                placeholder="authority@organization.org"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 dark:focus:ring-cyan-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {selectedRole === "issuer" ? "Intended Credential Types & Use Case *" : "Verification Requirements & Scope *"}
              </label>
              <textarea
                rows={3}
                required
                placeholder={
                  selectedRole === "issuer"
                    ? "Describe which verifiable credentials your organization plans to issue (e.g. employee badges, academic degrees, KYC certificates)..."
                    : "Describe what verifiable claims your platform needs to verify (e.g. age verification, accredited investor status)..."
                }
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 dark:focus:ring-cyan-400 transition-all font-sans"
              />
            </div>

            {/* Security Notice Box */}
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-slate-950/80 border border-sky-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
              <span className="font-semibold text-slate-900 dark:text-slate-200 block mb-0.5">
                Security Policy Enforcement:
              </span>
              Submitting this form stores a real request in Convex. To maintain protocol security, your active role will remain <code className="font-mono text-sky-600 dark:text-cyan-400">&quot;user&quot;</code> until reviewed and approved by network administrators.
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("select")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[160px] justify-center"
              >
                {isSubmitting ? "Submitting..." : `Submit ${selectedRole === "issuer" ? "Issuer" : "Verifier"} Request`}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: Submission Confirmation */}
      {step === "submitted" && selectedRole && (
        <div className="max-w-lg mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Request Submitted Successfully
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Your application for the <strong className="text-slate-900 dark:text-white capitalize">{selectedRole}</strong> role has been recorded in the Convex database and is pending administrative review.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-left text-xs font-mono space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">Organization:</span>
              <span className="text-slate-900 dark:text-slate-200 font-semibold">{orgName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contact Email:</span>
              <span className="text-slate-900 dark:text-slate-200">{contactEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Active Role:</span>
              <span className="text-sky-600 dark:text-cyan-400 font-bold">user</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Request Status:</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">Pending Review</span>
            </div>
          </div>

          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full justify-center"
          >
            Continue to Dashboard &rarr;
          </Button>
        </div>
      )}
    </div>
  );
}
