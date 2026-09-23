import { query } from "./_generated/server";

/**
 * Minimal authenticated Convex query to verify Clerk ↔ Convex authentication.
 *
 * - Verifies the authenticated JWT passed from Clerk via ConvexProviderWithClerk.
 * - Rejects unauthenticated requests with an explicit error.
 * - Returns only minimal real identity data from ctx.auth.getUserIdentity().
 * - Performs NO database writes.
 */
export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: No valid Clerk session recognized by Convex");
    }

    return {
      tokenIdentifier: identity.tokenIdentifier,
      subject: identity.subject,
      issuer: identity.issuer,
      name: identity.name ?? null,
      email: identity.email ?? null,
      emailVerified: identity.emailVerified ?? null,
      pictureUrl: identity.pictureUrl ?? null,
      nickname: identity.nickname ?? null,
      updatedAt: identity.updatedAt ?? null,
    };
  },
});
