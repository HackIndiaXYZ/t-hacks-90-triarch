import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getAuthenticatedUser } from "./lib/auth";

/**
 * saveRegistrationChallenge
 *
 * Stores a cryptographically random challenge for WebAuthn registration.
 */
export const saveRegistrationChallenge = mutation({
  args: {
    challenge: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user = null;
    const auth = await getAuthenticatedUser(ctx);
    if (auth) {
      user = auth.user;
    } else if (args.clerkId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
        .unique();
    }

    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 minute validity

    // Clean up old challenges for this user if identified
    if (user) {
      const old = await ctx.db
        .query("webauthnChallenges")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", user.clerkId))
        .collect();

      for (const item of old) {
        await ctx.db.delete(item._id);
      }
    }

    await ctx.db.insert("webauthnChallenges", {
      challenge: args.challenge,
      clerkId: user?.clerkId || args.clerkId,
      userId: user?._id,
      purpose: "registration",
      expiresAt,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * saveAuthenticationChallenge
 *
 * Stores a challenge for WebAuthn authentication (sign-in).
 */
export const saveAuthenticationChallenge = mutation({
  args: {
    challenge: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000;

    await ctx.db.insert("webauthnChallenges", {
      challenge: args.challenge,
      clerkId: args.clerkId,
      purpose: "authentication",
      expiresAt,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * verifyAndConsumeChallenge
 *
 * Validates that a challenge exists, matches the expected purpose, and has not expired.
 */
export const verifyAndConsumeChallenge = mutation({
  args: {
    challenge: v.string(),
    purpose: v.union(v.literal("registration"), v.literal("authentication")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const record = await ctx.db
      .query("webauthnChallenges")
      .withIndex("by_challenge", (q) => q.eq("challenge", args.challenge))
      .first();

    if (!record) {
      return { valid: false, error: "Challenge not found or expired." };
    }

    if (record.purpose !== args.purpose) {
      return { valid: false, error: "Challenge purpose mismatch." };
    }

    if (now > record.expiresAt) {
      await ctx.db.delete(record._id);
      return { valid: false, error: "Challenge has expired." };
    }

    // Consume challenge
    await ctx.db.delete(record._id);

    return {
      valid: true,
      clerkId: record.clerkId,
      userId: record.userId,
    };
  },
});

/**
 * storePasskey
 *
 * Persists the verified WebAuthn public credential metadata in Convex.
 * Note: Never stores private keys or biometric samples.
 */
export const storePasskey = mutation({
  args: {
    credentialId: v.string(),
    publicKey: v.string(),
    counter: v.number(),
    deviceType: v.string(),
    backedUp: v.boolean(),
    transports: v.optional(v.array(v.string())),
    deviceName: v.optional(v.string()),
    aaguid: v.optional(v.string()),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user = null;
    const auth = await getAuthenticatedUser(ctx);
    if (auth) {
      user = auth.user;
    } else if (args.clerkId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
        .unique();
    }

    if (!user) {
      throw new Error("User record not found for passkey registration.");
    }

    const now = Date.now();

    // Check for existing passkey with this credential ID
    const existing = await ctx.db
      .query("passkeys")
      .withIndex("by_credentialId", (q) => q.eq("credentialId", args.credentialId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        publicKey: args.publicKey,
        counter: args.counter,
        deviceType: args.deviceType,
        backedUp: args.backedUp,
        transports: args.transports,
        deviceName: args.deviceName || existing.deviceName,
        aaguid: args.aaguid,
        revoked: false,
        lastUsedAt: now,
      });
      return existing._id;
    }

    const passkeyId = await ctx.db.insert("passkeys", {
      credentialId: args.credentialId,
      publicKey: args.publicKey,
      counter: args.counter,
      deviceType: args.deviceType,
      backedUp: args.backedUp,
      transports: args.transports,
      userId: user._id,
      clerkId: user.clerkId,
      userEmail: user.email,
      userName: user.name || user.username,
      deviceName: args.deviceName || "Primary Device Passkey",
      aaguid: args.aaguid,
      createdAt: now,
      lastUsedAt: now,
      revoked: false,
    });

    return passkeyId;
  },
});

/**
 * getPasskeyByCredentialId
 *
 * Looks up passkey public metadata for server-side cryptographic authentication verification.
 */
export const getPasskeyByCredentialId = query({
  args: {
    credentialId: v.string(),
  },
  handler: async (ctx, args) => {
    const passkey = await ctx.db
      .query("passkeys")
      .withIndex("by_credentialId", (q) => q.eq("credentialId", args.credentialId))
      .first();

    if (!passkey || passkey.revoked) {
      return null;
    }

    return passkey;
  },
});

/**
 * updatePasskeyUsage
 *
 * Updates counter and timestamp on successful passkey authentication.
 */
export const updatePasskeyUsage = mutation({
  args: {
    credentialId: v.string(),
    newCounter: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const passkey = await ctx.db
      .query("passkeys")
      .withIndex("by_credentialId", (q) => q.eq("credentialId", args.credentialId))
      .first();

    if (!passkey) {
      throw new Error("Passkey not found.");
    }

    await ctx.db.patch(passkey._id, {
      counter: args.newCounter,
      lastUsedAt: now,
    });

    return { success: true };
  },
});

/**
 * getUserPasskeys
 *
 * Lists registered passkeys for the currently authenticated user.
 */
export const getUserPasskeys = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthenticatedUser(ctx);
    if (!auth || !auth.user) {
      return [];
    }
    const user = auth.user;

    const passkeys = await ctx.db
      .query("passkeys")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return passkeys
      .filter((p) => !p.revoked)
      .map((p) => ({
        _id: p._id,
        credentialId: p.credentialId,
        deviceName: p.deviceName,
        deviceType: p.deviceType,
        backedUp: p.backedUp,
        transports: p.transports,
        createdAt: p.createdAt,
        lastUsedAt: p.lastUsedAt,
      }));
  },
});

/**
 * deletePasskey
 *
 * Revokes a registered passkey.
 */
export const deletePasskey = mutation({
  args: {
    passkeyId: v.id("passkeys"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const passkey = await ctx.db.get(args.passkeyId);
    if (!passkey) {
      throw new Error("Passkey not found.");
    }

    if (passkey.userId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized: You can only delete your own passkeys.");
    }

    await ctx.db.delete(args.passkeyId);
    return { success: true };
  },
});
