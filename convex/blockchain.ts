import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireUser } from "./lib/auth";

/**
 * recordAnchorPending
 *
 * Sets anchor status to PENDING when a blockchain transaction is initiated.
 */
export const recordAnchorPending = mutation({
  args: {
    credentialDocId: v.id("credentials"),
    credentialHash: v.string(),
    network: v.string(),
    chainId: v.number(),
    contractAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["issuer", "admin"]);
    const now = Date.now();

    const cred = await ctx.db.get(args.credentialDocId);
    if (!cred) {
      throw new Error("Credential not found.");
    }

    // Check if already anchored
    if (cred.blockchainAnchorStatus === "ANCHORED") {
      throw new Error("Credential is already anchored on Ethereum Sepolia.");
    }

    // Update credential table
    await ctx.db.patch(args.credentialDocId, {
      blockchainAnchorStatus: "PENDING",
      blockchainCredentialHash: args.credentialHash,
      blockchainContractAddress: args.contractAddress,
      blockchainNetwork: args.network,
      updatedAt: now,
    });

    // Check if an existing anchor record exists for this credential (for retries)
    const existingAnchor = await ctx.db
      .query("blockchainAnchors")
      .withIndex("by_credentialDocId", (q) => q.eq("credentialDocId", args.credentialDocId))
      .first();

    if (existingAnchor) {
      await ctx.db.patch(existingAnchor._id, {
        status: "PENDING",
        credentialHash: args.credentialHash,
        failureReason: undefined,
        updatedAt: now,
      });
      return existingAnchor._id;
    }

    const anchorId = await ctx.db.insert("blockchainAnchors", {
      credentialDocId: args.credentialDocId,
      credentialId: cred.credentialId,
      credentialHash: args.credentialHash,
      network: args.network,
      chainId: args.chainId,
      contractAddress: args.contractAddress,
      anchoredByUserId: user._id,
      anchoredByClerkId: user.clerkId,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    return anchorId;
  },
});

/**
 * recordAnchorSuccess
 *
 * Persists the confirmed on-chain transaction hash, block number, and timestamp.
 */
export const recordAnchorSuccess = mutation({
  args: {
    credentialDocId: v.id("credentials"),
    credentialHash: v.string(),
    transactionHash: v.string(),
    blockNumber: v.number(),
    anchoredAt: v.number(),
    contractAddress: v.string(),
    network: v.string(),
    chainId: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["issuer", "admin"]);
    const now = Date.now();

    const cred = await ctx.db.get(args.credentialDocId);
    if (!cred) {
      throw new Error("Credential not found.");
    }

    // Update credential table
    await ctx.db.patch(args.credentialDocId, {
      blockchainAnchorStatus: "ANCHORED",
      blockchainTxHash: args.transactionHash,
      blockchainBlockNumber: args.blockNumber,
      blockchainCredentialHash: args.credentialHash,
      blockchainAnchoredAt: args.anchoredAt,
      blockchainContractAddress: args.contractAddress,
      blockchainNetwork: args.network,
      blockchainFailureReason: undefined,
      updatedAt: now,
    });

    // Update or insert into blockchainAnchors table
    const existingAnchor = await ctx.db
      .query("blockchainAnchors")
      .withIndex("by_credentialDocId", (q) => q.eq("credentialDocId", args.credentialDocId))
      .first();

    if (existingAnchor) {
      await ctx.db.patch(existingAnchor._id, {
        status: "ANCHORED",
        transactionHash: args.transactionHash,
        blockNumber: args.blockNumber,
        anchoredAt: args.anchoredAt,
        contractAddress: args.contractAddress,
        failureReason: undefined,
        updatedAt: now,
      });
      return existingAnchor._id;
    }

    const anchorId = await ctx.db.insert("blockchainAnchors", {
      credentialDocId: args.credentialDocId,
      credentialId: cred.credentialId,
      credentialHash: args.credentialHash,
      network: args.network,
      chainId: args.chainId,
      contractAddress: args.contractAddress,
      transactionHash: args.transactionHash,
      blockNumber: args.blockNumber,
      anchoredAt: args.anchoredAt,
      anchoredByUserId: user._id,
      anchoredByClerkId: user.clerkId,
      status: "ANCHORED",
      createdAt: now,
      updatedAt: now,
    });

    return anchorId;
  },
});

/**
 * recordAnchorFailure
 *
 * Records a failure reason if the transaction reverted or failed during broadcast.
 */
export const recordAnchorFailure = mutation({
  args: {
    credentialDocId: v.id("credentials"),
    failureReason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["issuer", "admin"]);
    const now = Date.now();

    await ctx.db.patch(args.credentialDocId, {
      blockchainAnchorStatus: "FAILED",
      blockchainFailureReason: args.failureReason,
      updatedAt: now,
    });

    const existingAnchor = await ctx.db
      .query("blockchainAnchors")
      .withIndex("by_credentialDocId", (q) => q.eq("credentialDocId", args.credentialDocId))
      .first();

    if (existingAnchor) {
      await ctx.db.patch(existingAnchor._id, {
        status: "FAILED",
        failureReason: args.failureReason,
        updatedAt: now,
      });
    }
  },
});

/**
 * getCredentialAnchor
 *
 * Fetches anchor details for a given credential document ID.
 */
export const getCredentialAnchor = query({
  args: {
    credentialDocId: v.id("credentials"),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);

    const anchor = await ctx.db
      .query("blockchainAnchors")
      .withIndex("by_credentialDocId", (q) => q.eq("credentialDocId", args.credentialDocId))
      .first();

    return anchor;
  },
});
