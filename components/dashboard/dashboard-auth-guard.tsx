"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface DashboardAuthGuardProps {
  children: React.ReactNode;
}

export function DashboardAuthGuard({ children }: DashboardAuthGuardProps) {
  const router = useRouter();
  const { isLoaded: isClerkLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isClerkLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isClerkLoaded, isSignedIn, router]);

  return <>{children}</>;
}
