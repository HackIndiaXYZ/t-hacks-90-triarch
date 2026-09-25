import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireAdmin, isInitialAdmin } from "./lib/auth";

export const UserRoleValidator = v.union(
  v.literal("user"),
  v.literal("issuer"),
  v.literal("verifier"),
  v.literal("admin")
);

/**
 * syncCurrentUser
 *
 * Securely synchronizes the authenticated Clerk user to the Convex database.
 * - Extracts identity exclusively from verified ctx.auth.getUserIdentity() (zero client trust for clerkId).
 * - Queries by index 'by_clerkId' to prevent duplicate records.
 * - Sets default role = "user" for newly created users, or "admin" if email matches INITIAL_ADMIN_EMAIL.
 * - Updates mutable profile data (username, email, name, imageUrl) if changed.
 */
export const syncCurrentUser = mutation({
  args: {
    username: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Cannot sync user without a valid Clerk session.");
    }

    // Never trust client-provided clerkId — use verified session subject
    const clerkId = identity.subject;
    const email = identity.email || args.email || undefined;
    const name = identity.name || args.name || undefined;
    const username = identity.nickname || args.username || undefined;
    const imageUrl = identity.pictureUrl || args.imageUrl || undefined;
    const now = Date.now();

    const shouldBeAdmin = isInitialAdmin(email, clerkId);

    // Query for existing user using index
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existingUser) {
      const role = shouldBeAdmin && existingUser.role !== "admin" ? "admin" : (existingUser.role || "user");
      const shouldMarkOnboarded =
        (role === "admin" || role === "issuer" || role === "verifier") && !existingUser.onboardingCompleted;

      const needsUpdate =
        existingUser.email !== email ||
        existingUser.name !== name ||
        existingUser.username !== username ||
        existingUser.imageUrl !== imageUrl ||
        existingUser.role !== role ||
        shouldMarkOnboarded;

      if (needsUpdate) {
        await ctx.db.patch(existingUser._id, {
          email: email ?? existingUser.email,
          name: name ?? existingUser.name,
          username: username ?? existingUser.username,
          imageUrl: imageUrl ?? existingUser.imageUrl,
          role,
          onboardingCompleted: existingUser.onboardingCompleted || shouldMarkOnboarded || false,
          updatedAt: now,
        });
        const updated = await ctx.db.get(existingUser._id);
        return { user: updated, isNew: false };
      }

      return { user: existingUser, isNew: false };
    }

    // Insert new user record
    const newUserId = await ctx.db.insert("users", {
      clerkId,
      username,
      email,
      name,
      imageUrl,
      role: shouldBeAdmin ? "admin" : "user",
      onboardingCompleted: shouldBeAdmin ? true : false,
      createdAt: now,
      updatedAt: now,
    });

    const newUser = await ctx.db.get(newUserId);
    return { user: newUser, isNew: true };
  },
});

/**
 * getCurrentUser
 *
 * Securely fetches the authenticated user's own record including role from Convex.
 * - Enforces authentication via ctx.auth.getUserIdentity().
 * - Only queries by the caller's verified subject ID (prevents cross-user data access).
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const clerkId = identity.subject;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
  },
});

/**
 * changeUserRole
 *
 * Secure server-side mutation to update a user's role.
 * - Requires authenticated caller.
 * - SECURITY: Ordinary users ('user' role) are strictly prohibited from self-promoting
 *   or modifying roles.
 * - Prevents unauthorized privilege escalation.
 */
export const changeUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: UserRoleValidator,
  },
  handler: async (ctx, args) => {
    const caller = await requireUser(ctx);

    // Security Rule: Ordinary users cannot change roles
    if (caller.role === "user") {
      throw new Error(
        "Forbidden: Ordinary users cannot modify roles or self-promote to issuer/verifier."
      );
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("User not found.");
    }

    await ctx.db.patch(args.targetUserId, {
      role: args.newRole,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.targetUserId);
  },
});

/**
 * verifyRoleAuthorization
 *
 * Server-side authorization check query.
 * Tests backend role enforcement against ctx.auth.
 */
export const verifyRoleAuthorization = query({
  args: {
    requiredRole: UserRoleValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { authorized: false, reason: "Unauthenticated" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return { authorized: false, reason: "User not synced to Convex" };
    }

    if (user.role !== args.requiredRole) {
      return {
        authorized: false,
        reason: `Role mismatch: User has role '${user.role}', required '${args.requiredRole}'`,
        currentRole: user.role,
      };
    }

    return {
      authorized: true,
      currentRole: user.role,
    };
  },
});

/**
 * completeUserOnboarding
 *
 * Marks onboarding as completed for the authenticated user while strictly maintaining role = "user".
 * Enforces ctx.auth authentication.
 */
export const completeUserOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(user._id);
  },
});

/**
 * getAllUsers
 *
 * Admin query to fetch all registered users in the network with their roles.
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * adminUpdateUserRole
 *
 * Admin mutation to directly modify any user's role.
 */
export const adminUpdateUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: UserRoleValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("User not found.");
    }

    await ctx.db.patch(args.targetUserId, {
      role: args.newRole,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.targetUserId);
  },
});

/**
 * registerUserDid
 *
 * Persists the user's generated W3C did:key and public key metadata in Convex.
 * - Enforces requireUser(ctx).
 * - NEVER accepts or stores private keys.
 * - Idempotency: If the user already has a DID registered, returns the existing record without overwriting.
 * - Checks that the DID starts with "did:key:" and is non-empty.
 */
export const registerUserDid = mutation({
  args: {
    did: v.string(),
    publicKey: v.string(),
    keyType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Validate DID format
    if (!args.did.startsWith("did:key:") || args.did.length < 20) {
      throw new Error("Invalid W3C did:key identifier format.");
    }

    // Idempotency: If user already has a registered DID, return existing user record
    if (user.did) {
      return {
        user,
        alreadyRegistered: true,
      };
    }

    // Ensure DID is unique across the users table
    const existingWithDid = await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", args.did))
      .unique();

    if (existingWithDid && existingWithDid._id !== user._id) {
      throw new Error("This DID is already bound to another registered identity.");
    }

    const now = Date.now();
    await ctx.db.patch(user._id, {
      did: args.did,
      publicKey: args.publicKey,
      keyType: args.keyType,
      didCreatedAt: now,
      updatedAt: now,
    });

    const updatedUser = await ctx.db.get(user._id);
    return {
      user: updatedUser,
      alreadyRegistered: false,
    };
  },
});

/**
 * getUserByDid
 *
 * Resolves a public user identity document by its W3C DID identifier.
 */
export const getUserByDid = query({
  args: {
    did: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", args.did))
      .unique();
  },
});

/**
 * adminResetUserDid
 *
 * Admin utility to reset a user's DID for re-testing key generation.
 */
export const adminResetUserDid = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.targetUserId, {
      did: undefined,
      publicKey: undefined,
      keyType: undefined,
      didCreatedAt: undefined,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.targetUserId);
  },
});

