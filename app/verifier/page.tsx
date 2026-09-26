import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { VerifierDashboard } from "@/components/verifier/verifier-dashboard";

export const metadata = {
  title: "Verifier Console | Verifi Digital Identity",
  description: "Cryptographic verification and audit enclave for W3C Verifiable Credentials.",
};

export default async function VerifierPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <VerifierDashboard />
    </div>
  );
}
