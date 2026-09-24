import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

export type Role = "user" | "issuer" | "verifier" | "admin";

export function isInitialAdmin(email?: string, clerkId?: string): boolean {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const adminClerkId = process.env.INITIAL_ADMIN_CLERK_ID;

  if (adminEmail && email && email.trim().toLowerCase() === adminEmail.trim().toLowerCase()) {
    return true;
  }
  if (adminClerkId && clerkId && clerkId.trim() === adminClerkId.trim()) {
    return true;
  }
  return false;
}

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

  let user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  const email = identity.email ?? undefined;
  const name = identity.name ?? undefined;
  const username = identity.nickname ?? undefined;
  const imageUrl = identity.pictureUrl ?? undefined;
  const now = Date.now();
  const shouldBeAdmin = isInitialAdmin(email, identity.subject);

  // If in a mutation context and user record does not exist yet, auto-provision
  // with verified Clerk identity
  if (!user && "insert" in ctx.db) {
    const initialRole: Role = shouldBeAdmin ? "admin" : "user";
    const userId = await (ctx as MutationCtx).db.insert("users", {
      clerkId: identity.subject,
      username,
      email,
      name,
      imageUrl,
      role: initialRole,
      onboardingCompleted: shouldBeAdmin ? true : false,
      createdAt: now,
      updatedAt: now,
    });
    user = await ctx.db.get(userId);
  } else if (user && "patch" in ctx.db) {
    // If user exists and profile data or initial admin status changed, auto-sync during mutation
    const targetRole = shouldBeAdmin && user.role !== "admin" ? "admin" : user.role;
    const shouldMarkOnboarded =
      (targetRole === "admin" || targetRole === "issuer" || targetRole === "verifier") &&
      !user.onboardingCompleted;

    const needsUpdate =
      (email !== undefined && user.email !== email) ||
      (name !== undefined && user.name !== name) ||
      (username !== undefined && user.username !== username) ||
      (imageUrl !== undefined && user.imageUrl !== imageUrl) ||
      user.role !== targetRole ||
      shouldMarkOnboarded;

    if (needsUpdate) {
      await (ctx as MutationCtx).db.patch(user._id, {
        email: email ?? user.email,
        name: name ?? user.name,
        username: username ?? user.username,
        imageUrl: imageUrl ?? user.imageUrl,
        role: targetRole,
        onboardingCompleted: user.onboardingCompleted || shouldMarkOnboarded || false,
        updatedAt: now,
      });
      user = await ctx.db.get(user._id);
    }
  }

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

/**
 * requireAdmin
 *
 * Enforces that the caller has the 'admin' role. Throws a forbidden error otherwise.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new Error(`Forbidden: Action requires 'admin' role. Current role: '${user.role}'.`);
  }
  return user;
}
