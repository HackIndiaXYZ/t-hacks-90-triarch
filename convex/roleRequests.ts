import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireAdmin } from "./lib/auth";

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

/**
 * getAllRoleRequests
 *
 * Admin query to fetch all role requests across the network, optionally filtered by status.
 * Enriches each record with user profile details from the users collection.
 */
export const getAllRoleRequests = query({
  args: {
    status: v.optional(RoleRequestStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let requests;
    if (args.status) {
      requests = await ctx.db
        .query("roleRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      requests = await ctx.db.query("roleRequests").collect();
    }

    // Enrich with current user data
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const user = await ctx.db.get(req.userId);
        return {
          ...req,
          user: user
            ? {
                _id: user._id,
                clerkId: user.clerkId,
                username: user.username,
                email: user.email,
                name: user.name,
                imageUrl: user.imageUrl,
                currentRole: user.role,
              }
            : null,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * getRoleRequestStats
 *
 * Admin query to get statistics on role requests and network authority roles.
 */
export const getRoleRequestStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allRequests = await ctx.db.query("roleRequests").collect();
    const allUsers = await ctx.db.query("users").collect();

    const pending = allRequests.filter((r) => r.status === "pending").length;
    const approved = allRequests.filter((r) => r.status === "approved").length;
    const rejected = allRequests.filter((r) => r.status === "rejected").length;

    const issuers = allUsers.filter((u) => u.role === "issuer").length;
    const verifiers = allUsers.filter((u) => u.role === "verifier").length;
    const admins = allUsers.filter((u) => u.role === "admin").length;
    const standardUsers = allUsers.filter((u) => u.role === "user").length;

    return {
      totalRequests: allRequests.length,
      pendingRequests: pending,
      approvedRequests: approved,
      rejectedRequests: rejected,
      totalUsers: allUsers.length,
      activeIssuers: issuers,
      activeVerifiers: verifiers,
      adminCount: admins,
      standardUserCount: standardUsers,
    };
  },
});

/**
 * approveRoleRequest
 *
 * Admin mutation to approve a pending role request.
 * - Enforces requireAdmin(ctx).
 * - Upgrades user's role to requestedRole (issuer / verifier).
 * - Sets roleRequests status = "approved".
 * - Prevents duplicate reviews.
 */
export const approveRoleRequest = mutation({
  args: {
    requestId: v.id("roleRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const now = Date.now();

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Role request not found.");
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot approve request. It has already been reviewed as '${request.status}'.`);
    }

    const targetUser = await ctx.db.get(request.userId);
    if (!targetUser) {
      throw new Error("Target user associated with this request not found.");
    }

    // 1. Upgrade user's role to the requested authority role
    await ctx.db.patch(targetUser._id, {
      role: request.requestedRole,
      onboardingCompleted: true,
      updatedAt: now,
    });

    // 2. Mark request as approved with review metadata
    await ctx.db.patch(request._id, {
      status: "approved",
      reviewedAt: now,
      reviewedBy: adminUser.clerkId,
      adminNotes: args.adminNotes?.trim(),
      updatedAt: now,
    });

    const updatedRequest = await ctx.db.get(request._id);
    const updatedUser = await ctx.db.get(targetUser._id);

    return {
      success: true,
      request: updatedRequest,
      user: updatedUser,
    };
  },
});

/**
 * rejectRoleRequest
 *
 * Admin mutation to reject a pending role request.
 * - Enforces requireAdmin(ctx).
 * - Leaves user's role as "user".
 * - Sets roleRequests status = "rejected".
 * - Prevents duplicate reviews.
 */
export const rejectRoleRequest = mutation({
  args: {
    requestId: v.id("roleRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const now = Date.now();

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Role request not found.");
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot reject request. It has already been reviewed as '${request.status}'.`);
    }

    // Mark request as rejected with review metadata
    await ctx.db.patch(request._id, {
      status: "rejected",
      reviewedAt: now,
      reviewedBy: adminUser.clerkId,
      adminNotes: args.adminNotes?.trim(),
      updatedAt: now,
    });

    const updatedRequest = await ctx.db.get(request._id);

    return {
      success: true,
      request: updatedRequest,
    };
  },
});
