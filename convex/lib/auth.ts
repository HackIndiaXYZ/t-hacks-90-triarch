import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

export type Role = "user" | "issuer" | "verifier";

/**
 * getAuthenticatedUser
 *
 * Retrieves the verified Clerk identity and corresponding Convex user document.
 * Returns null if the caller is unauthenticated or has not yet been synced to the database.
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
): Promise<{ identity: NonNullable<Awaited<ReturnType<typeof ctx.auth.getUserIdentity>>>; user: Doc<"users"> } | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    return null;
  }

  return { identity, user };
}

/**
 * requireUser
 *
 * Enforces that the caller has a valid authenticated session and an existing
 * user record in the Convex database. Returns the user document.
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const auth = await getAuthenticatedUser(ctx);
  if (!auth) {
    throw new Error("Unauthorized: Valid authenticated session required.");
  }
  return auth.user;
}

/**
 * requireIssuer
 *
 * Enforces that the caller has the 'issuer' role. Throws a forbidden error otherwise.
 */
export async function requireIssuer(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "issuer") {
    throw new Error(`Forbidden: Action requires 'issuer' role. Current role: '${user.role}'.`);
  }
  return user;
}

/**
 * requireVerifier
 *
 * Enforces that the caller has the 'verifier' role. Throws a forbidden error otherwise.
 */
export async function requireVerifier(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "verifier") {
    throw new Error(`Forbidden: Action requires 'verifier' role. Current role: '${user.role}'.`);
  }
  return user;
}

/**
 * requireRole
 *
 * Enforces that the caller has one of the specified allowed roles.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: Role[]
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `Forbidden: Action requires one of [${allowedRoles.join(", ")}]. Current role: '${user.role}'.`
    );
  }
  return user;
}
