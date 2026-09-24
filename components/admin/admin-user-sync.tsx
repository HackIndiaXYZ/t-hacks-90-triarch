"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

export function AdminUserSync() {
  const { isAuthenticated } = useConvexAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);
  const lastSyncedKeyRef = useRef<string>("");

  useEffect(() => {
    if (isAuthenticated && isClerkLoaded && clerkUser) {
      const email =
        clerkUser.primaryEmailAddress?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        "";
      const username = clerkUser.username || "";
      const name =
        clerkUser.fullName ||
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        "";
      const imageUrl = clerkUser.imageUrl || "";

      const syncKey = `${clerkUser.id}:${username}:${email}:${name}:${imageUrl}`;

      if (lastSyncedKeyRef.current !== syncKey) {
        lastSyncedKeyRef.current = syncKey;
        syncCurrentUser({
          username: username || undefined,
          email: email || undefined,
          name: name || undefined,
          imageUrl: imageUrl || undefined,
        }).catch((err) => {
          console.error("Failed to sync admin user to Convex:", err);
        });
      }
    }
  }, [isAuthenticated, isClerkLoaded, clerkUser, syncCurrentUser]);

  return null;
}
