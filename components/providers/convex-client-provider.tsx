"use client";

import React, { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

/**
 * ConvexClientProvider
 *
 * Prepares the architecture to bridge Clerk authenticated sessions
 * with Convex backend reactively, without mock users or fake tokens.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
