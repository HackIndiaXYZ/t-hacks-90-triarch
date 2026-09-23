import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RoleOnboardingFlow } from "@/components/onboarding/role-onboarding-flow";

export default async function OnboardingPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-cyber-grid transition-colors duration-200">
      <div className="w-full max-w-4xl">
        <RoleOnboardingFlow />
      </div>
    </div>
  );
}
