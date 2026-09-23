import React from "react";
import { IdentityCard } from "@/components/dashboard/identity-card";
import { CredentialsSection } from "@/components/dashboard/credentials-section";
import { ActivitySection } from "@/components/dashboard/activity-section";
import { RoleAuthorizationCard } from "@/components/dashboard/role-authorization-card";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Identity Card (Status: Not created, DID: Not created yet) */}
      <IdentityCard />

      {/* Role & Backend Authorization Engine */}
      <RoleAuthorizationCard />

      {/* Credentials & Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CredentialsSection />
        <ActivitySection />
      </div>
    </div>
  );
}
