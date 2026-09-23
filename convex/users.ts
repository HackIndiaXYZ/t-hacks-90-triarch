import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const UserRoleValidator = v.union(
  v.literal("user"),
  v.literal("issuer"),
  v.literal("verifier")
);

/**
 * syncCurrentUser
 *
 * Securely synchronizes the authenticated Clerk user to the Convex database.
 * - Extracts identity exclusively from ctx.auth.getUserIdentity() (zero client trust).
 * - Queries by index 'by_clerkId' to prevent duplicate records.
 * - Sets default role = "user" for all newly created users.
 * - Updates mutable profile data (name, email) if changed.
 */
export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Cannot sync user without a valid Clerk session.");
    }

    const clerkId = identity.subject;
    const email = identity.email ?? undefined;
    const name = identity.name ?? undefined;
    const now = Date.now();

    // Query for existing user using index
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existingUser) {
      // Ensure role exists on legacy records if any, default to "user"
      const role = existingUser.role || "user";
      const needsUpdate =
        existingUser.email !== email ||
        existingUser.name !== name ||
        existingUser.role !== role;

      if (needsUpdate) {
        await ctx.db.patch(existingUser._id, {
          email,
          name,
          role,
          updatedAt: now,
        });
        const updated = await ctx.db.get(existingUser._id);
        return { user: updated, isNew: false };
      }

      return { user: existingUser, isNew: false };
    }

    // Insert new user record with default role = "user"
    const newUserId = await ctx.db.insert("users", {
      clerkId,
      email,
      name,
      role: "user",
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

