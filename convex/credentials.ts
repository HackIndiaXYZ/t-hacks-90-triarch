import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireRole, getAuthenticatedUser } from "./lib/auth";

/**
 * issueVerifiableCredential
 *
 * Secure server mutation to record a cryptographically signed W3C Verifiable Credential.
 * - Enforces caller role: "issuer" or "admin".
 * - Validates that the recipient DID corresponds to a real registered user in Convex.
 * - Stores full W3C JSON, cryptographic proof, and claims.
 * - Sets status: "active".
 */
export const issueVerifiableCredential = mutation({
  args: {
    credentialId: v.string(),
    type: v.array(v.string()),
    issuerDid: v.string(),
    issuerName: v.string(),
    recipientDid: v.string(),
    credentialData: v.any(),
    issuedAt: v.number(),
    expirationDate: v.optional(v.number()),
    rawVcJson: v.string(),
    proof: v.object({
      type: v.string(),
      created: v.string(),
      proofPurpose: v.string(),
      verificationMethod: v.string(),
      jws: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // 1. Enforce issuer authority authorization
    const issuerUser = await requireRole(ctx, ["issuer", "admin"]);

    // 2. Validate issuer has a provisioned DID
    if (!issuerUser.did) {
      throw new Error(
        "Issuer account must have an active provisioned DID before signing and issuing credentials."
      );
    }

    if (issuerUser.did !== args.issuerDid) {
      throw new Error(
        `Issuer DID mismatch. Authenticated session DID is '${issuerUser.did}', but payload specified '${args.issuerDid}'.`
      );
    }

    // 3. Find and validate real recipient user in Convex
    const recipientUser = await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", args.recipientDid))
      .unique();

    if (!recipientUser) {
      throw new Error(
        `Recipient with DID '${args.recipientDid}' was not found. Credentials can only be issued to real registered TrustID / Verifi users.`
      );
    }

    // 4. Validate expiration date if provided
    const now = Date.now();
    if (args.expirationDate && args.expirationDate <= args.issuedAt) {
      throw new Error("Expiration date must be in the future beyond issuance date.");
    }

    // 5. Prevent duplicate credential IDs
    const existingCred = await ctx.db
      .query("credentials")
      .withIndex("by_credentialId", (q) => q.eq("credentialId", args.credentialId))
      .unique();

    if (existingCred) {
      throw new Error(`Credential with ID '${args.credentialId}' has already been issued.`);
    }

    // 6. Insert new Verifiable Credential record
    const credentialDocId = await ctx.db.insert("credentials", {
      credentialId: args.credentialId,
      type: args.type,
      issuerDid: args.issuerDid,
      issuerName: args.issuerName,
      issuerUserId: issuerUser._id,
      recipientDid: args.recipientDid,
      recipientUserId: recipientUser._id,
      credentialData: args.credentialData,
      issuedAt: args.issuedAt,
      expirationDate: args.expirationDate,
      status: "active",
      rawVcJson: args.rawVcJson,
      proof: args.proof,
      createdAt: now,
      updatedAt: now,
    });

    const credential = await ctx.db.get(credentialDocId);
    return {
      success: true,
      credential,
      recipient: {
        _id: recipientUser._id,
        username: recipientUser.username,
        email: recipientUser.email,
        name: recipientUser.name,
      },
    };
  },
});

/**
 * getMyReceivedCredentials
 *
 * Fetches all Verifiable Credentials issued to the authenticated user's DID.
 */
export const getMyReceivedCredentials = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthenticatedUser(ctx);
    if (!auth || !auth.user) {
      return [];
    }

    const user = auth.user;

    if (!user.did) {
      return [];
    }

    // Query credentials bound to user's DID or user ID
    const byDid = await ctx.db
      .query("credentials")
      .withIndex("by_recipientDid", (q) => q.eq("recipientDid", user.did!))
      .collect();

    const byUserId = await ctx.db
      .query("credentials")
      .withIndex("by_recipientUserId", (q) => q.eq("recipientUserId", user._id))
      .collect();

    // Deduplicate by credentialId
    const map = new Map<string, typeof byDid[0]>();
    for (const c of [...byDid, ...byUserId]) {
      map.set(c.credentialId, c);
    }

    return Array.from(map.values()).sort((a, b) => b.issuedAt - a.issuedAt);
  },
});

/**
 * getMyIssuedCredentials
 *
 * Fetches all Verifiable Credentials issued by the authenticated issuer.
 */
export const getMyIssuedCredentials = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthenticatedUser(ctx);
    if (!auth || !auth.user) {
      return [];
    }
    const issuer = auth.user;
    if (issuer.role !== "issuer" && issuer.role !== "admin") {
      return [];
    }

    const issued = await ctx.db
      .query("credentials")
      .withIndex("by_issuerUserId", (q) => q.eq("issuerUserId", issuer._id))
      .collect();

    // Enrich with recipient details
    const enriched = await Promise.all(
      issued.map(async (cred) => {
        const recipient = await ctx.db.get(cred.recipientUserId);
        return {
          ...cred,
          recipient: recipient
            ? {
                _id: recipient._id,
                username: recipient.username,
                email: recipient.email,
                name: recipient.name,
                imageUrl: recipient.imageUrl,
              }
            : null,
        };
      })
    );

    return enriched.sort((a, b) => b.issuedAt - a.issuedAt);
  },
});

/**
 * revokeCredential
 *
 * Allows an authorized issuer to revoke a credential they previously issued.
 */
export const revokeCredential = mutation({
  args: {
    credentialDocId: v.id("credentials"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issuer = await requireRole(ctx, ["issuer", "admin"]);
    const credential = await ctx.db.get(args.credentialDocId);

    if (!credential) {
      throw new Error("Credential not found.");
    }

    // Only the issuing authority can revoke
    if (credential.issuerUserId !== issuer._id && issuer.role !== "admin") {
      throw new Error("Forbidden: You can only revoke credentials issued by your authority.");
    }

    if (credential.status === "revoked") {
      throw new Error("Credential has already been revoked.");
    }

    const now = Date.now();
    await ctx.db.patch(args.credentialDocId, {
      status: "revoked",
      revokedAt: now,
      revocationReason: args.reason || "Revoked by issuing authority",
      updatedAt: now,
    });

    return await ctx.db.get(args.credentialDocId);
  },
});

/**
 * getCredentialById
 *
 * Authenticated query to retrieve a credential by its Convex document ID.
 * Enforces that only the recipient, issuing authority, verifier, or admin can access the credential.
 */
export const getCredentialById = query({
  args: {
    credentialDocId: v.id("credentials"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const credential = await ctx.db.get(args.credentialDocId);

    if (!credential) {
      return null;
    }

    const isRecipient =
      credential.recipientUserId === user._id ||
      (user.did && credential.recipientDid === user.did);
    const isIssuer =
      credential.issuerUserId === user._id ||
      (user.did && credential.issuerDid === user.did);
    const isVerifierOrAdmin =
      user.role === "verifier" || user.role === "admin";

    if (!isRecipient && !isIssuer && !isVerifierOrAdmin) {
      throw new Error("Forbidden: You do not have permission to access this credential.");
    }

    return credential;
  },
});

/**
 * getRegisteredRecipients
 *
 * Query for Issuers to search and select verified registered identities with active DIDs.
 */
export const getRegisteredRecipients = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["issuer", "admin"]);

    const allUsers = await ctx.db.query("users").collect();
    // Only return users who have provisioned a real DID
    const withDid = allUsers.filter((u) => u.did && u.did.startsWith("did:key:"));

    return withDid.map((u) => ({
      _id: u._id,
      name: u.name,
      username: u.username,
      email: u.email,
      did: u.did!,
      role: u.role,
      imageUrl: u.imageUrl,
    }));
  },
});
