import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const RequestedRoleValidator = v.union(
  v.literal("issuer"),
  v.literal("verifier")
);

export const RoleRequestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

/**
 * submitRoleRequest
 *
 * Secure mutation allowing an authenticated user to submit a formal onboarding request
 * for elevated roles ("issuer" or "verifier").
 *
 * SECURITY:
 * - Uses ctx.auth to verify caller identity (never trusts client parameters).
 * - Strictly keeps caller's active role as "user" (DO NOT promote).
 * - Marks onboardingCompleted = true.
 * - Stores real request in Convex roleRequests table.
 */
export const submitRoleRequest = mutation({
  args: {
    requestedRole: RequestedRoleValidator,
    organizationName: v.string(),
    organizationType: v.optional(v.string()),
    website: v.optional(v.string()),
    contactEmail: v.string(),
    useCaseDescription: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Check if user already has a pending request for this role
    const existingPending = await ctx.db
      .query("roleRequests")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingPending) {
      // Update existing pending request with new details
      await ctx.db.patch(existingPending._id, {
        requestedRole: args.requestedRole,
        organizationName: args.organizationName.trim(),
        organizationType: args.organizationType?.trim(),
        website: args.website?.trim(),
        contactEmail: args.contactEmail.trim(),
        useCaseDescription: args.useCaseDescription.trim(),
        updatedAt: now,
      });

      await ctx.db.patch(user._id, {
        onboardingCompleted: true,
        updatedAt: now,
      });

      return await ctx.db.get(existingPending._id);
    }

    // Insert new pending role request
    const requestId = await ctx.db.insert("roleRequests", {
      userId: user._id,
      clerkId: user.clerkId,
      requestedRole: args.requestedRole,
      organizationName: args.organizationName.trim(),
      organizationType: args.organizationType?.trim(),
      website: args.website?.trim(),
      contactEmail: args.contactEmail.trim(),
      useCaseDescription: args.useCaseDescription.trim(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Mark onboarding completed for the user, but keep role as "user"
    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      updatedAt: now,
    });

    return await ctx.db.get(requestId);
  },
});

/**
 * getMyRoleRequests
 *
 * Fetches all role requests submitted by the currently authenticated user.
 */
export const getMyRoleRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const requests = await ctx.db
      .query("roleRequests")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return requests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * getLatestRoleRequest
 *
 * Fetches the latest submitted role request for the authenticated user.
 */
export const getLatestRoleRequest = query({
  args: {},
  handler: async (ctx) => {
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

    const requests = await ctx.db
      .query("roleRequests")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    if (requests.length === 0) {
      return null;
    }

    return requests.sort((a, b) => b.createdAt - a.createdAt)[0];
  },
});
