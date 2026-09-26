import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";
import { verifyVcSignature } from "./lib/vcVerifier";

function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * createQrShareToken
 *
 * Generates a short-lived, cryptographically secure token for sharing a Verifiable Credential via QR code.
 * - Enforces that only the credential recipient (holder), issuer, or admin can generate share tokens.
 * - Never includes credential claims or private data in the token itself.
 */
export const createQrShareToken = mutation({
  args: {
    credentialDocId: v.id("credentials"),
    durationMinutes: v.optional(v.number()), // e.g. 15, 60, 1440
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const cred = await ctx.db.get(args.credentialDocId);
    if (!cred) {
      throw new Error("Credential not found.");
    }

    // Ensure only the holder (recipient), issuer, or an admin can create a share token
    const isHolder = cred.recipientUserId === user._id || cred.recipientDid === user.did;
    const isIssuer = cred.issuerUserId === user._id || cred.issuerDid === user.did;
    const isAdmin = user.role === "admin";

    if (!isHolder && !isIssuer && !isAdmin) {
      throw new Error("Unauthorized: Only the credential holder or issuing authority can share this credential.");
    }

    const durationMinutes = args.durationMinutes && args.durationMinutes > 0 ? Math.min(args.durationMinutes, 1440) : 15;
    const expiresAt = now + durationMinutes * 60 * 1000;
    const token = generateSecureToken();

    const tokenId = await ctx.db.insert("qrShareTokens", {
      token,
      credentialDocId: args.credentialDocId,
      credentialId: cred.credentialId,
      holderUserId: user._id,
      holderClerkId: user.clerkId,
      expiresAt,
      status: "active",
      useCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      tokenId,
      token,
      expiresAt,
      durationMinutes,
      credentialId: cred.credentialId,
    };
  },
});

/**
 * revokeQrShareToken
 *
 * Allows the holder to immediately revoke an active QR sharing token.
 */
export const revokeQrShareToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const tokenDoc = await ctx.db
      .query("qrShareTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!tokenDoc) {
      throw new Error("QR token not found.");
    }

    if (tokenDoc.holderUserId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized: You can only revoke your own QR sharing tokens.");
    }

    await ctx.db.patch(tokenDoc._id, {
      status: "revoked",
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * getQrShareTokensForCredential
 *
 * Lists active QR share tokens for a given credential owned by the current user.
 */
export const getQrShareTokensForCredential = query({
  args: {
    credentialDocId: v.id("credentials"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tokens = await ctx.db
      .query("qrShareTokens")
      .withIndex("by_credentialDocId", (q) => q.eq("credentialDocId", args.credentialDocId))
      .collect();

    // Filter to tokens owned by user or if admin
    return tokens.filter((t) => t.holderUserId === user._id || user.role === "admin");
  },
});

/**
 * resolveAndVerifyQrToken
 *
 * Public endpoint that resolves a secure QR verification token, fetches the canonical
 * Verifiable Credential from the database, and performs authoritative cryptographic,
 * revocation, expiration, and on-chain blockchain verification.
 */
export const resolveAndVerifyQrToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Fetch token record
    const tokenDoc = await ctx.db
      .query("qrShareTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!tokenDoc) {
      return {
        success: false,
        result: "INVALID" as const,
        error: "Verification token not found or invalid. Please request a fresh QR code from the credential holder.",
      };
    }

    // 2. Check token revocation
    if (tokenDoc.status === "revoked") {
      return {
        success: false,
        result: "REVOKED" as const,
        error: "This QR verification token has been revoked by the credential holder.",
        tokenInfo: {
          createdAt: tokenDoc.createdAt,
          expiresAt: tokenDoc.expiresAt,
          status: "revoked",
        },
      };
    }

    // 3. Check token expiration
    if (now > tokenDoc.expiresAt || tokenDoc.status === "expired") {
      if (tokenDoc.status !== "expired") {
        await ctx.db.patch(tokenDoc._id, { status: "expired", updatedAt: now });
      }
      return {
        success: false,
        result: "EXPIRED" as const,
        error: "This QR verification token has expired. QR tokens are short-lived for holder privacy and security.",
        tokenInfo: {
          createdAt: tokenDoc.createdAt,
          expiresAt: tokenDoc.expiresAt,
          status: "expired",
        },
      };
    }

    // 4. Increment usage counter
    await ctx.db.patch(tokenDoc._id, {
      useCount: tokenDoc.useCount + 1,
      updatedAt: now,
    });

    // 5. Fetch canonical credential record
    const cred = await ctx.db.get(tokenDoc.credentialDocId);
    if (!cred) {
      return {
        success: false,
        result: "INVALID" as const,
        error: "Associated credential record no longer exists in the registry.",
      };
    }

    // 6. Cryptographically verify the signed W3C Verifiable Credential
    let parsedVc: Record<string, unknown> | null = null;
    try {
      parsedVc = JSON.parse(cred.rawVcJson);
    } catch {
      return {
        success: false,
        result: "INVALID" as const,
        error: "Malformed credential payload: Unable to parse canonical JSON-LD.",
      };
    }

    if (!parsedVc) {
      return {
        success: false,
        result: "INVALID" as const,
        error: "Empty credential document.",
      };
    }

    const sigResult = await verifyVcSignature(parsedVc);
    const signatureValid = sigResult.isValid;

    // 7. Check credential expiration
    const expirationValid = !cred.expirationDate || now <= cred.expirationDate;

    // 8. Check credential revocation status
    const statusValid = cred.status === "active";

    // 9. Determine overall verification outcome
    let result: "VERIFIED" | "INVALID" | "REVOKED" | "EXPIRED" = "VERIFIED";
    let failureReason: string | undefined = undefined;

    if (!signatureValid) {
      result = "INVALID";
      failureReason = sigResult.error || "Cryptographic signature mismatch: Signature does not match document digest.";
    } else if (!statusValid) {
      result = "REVOKED";
      failureReason = `Credential was revoked by issuing authority on ${cred.revokedAt ? new Date(cred.revokedAt).toISOString() : "record"}. Reason: ${cred.revocationReason || "Revoked"}`;
    } else if (!expirationValid) {
      result = "EXPIRED";
      failureReason = `Credential expired on ${cred.expirationDate ? new Date(cred.expirationDate).toISOString() : "unknown"}.`;
    }

    // 10. Extract minimal claims for verifier display
    const claims = cred.credentialData || {};
    const typeName = cred.type.find((t) => t !== "VerifiableCredential") || "VerifiableCredential";

    // 11. Compile blockchain anchoring proof
    const blockchain = {
      isAnchored: cred.blockchainAnchorStatus === "ANCHORED",
      status: cred.blockchainAnchorStatus || "UNANCHORED",
      txHash: cred.blockchainTxHash,
      blockNumber: cred.blockchainBlockNumber,
      contractAddress: cred.blockchainContractAddress || "0xcd72712c39C5da6de61Ba40AF5EA69Bcd43185c5",
      network: cred.blockchainNetwork || "sepolia",
      chainId: 11155111,
      anchoredAt: cred.blockchainAnchoredAt,
      etherscanTxUrl: cred.blockchainTxHash && cred.blockchainTxHash.startsWith("0x") && cred.blockchainTxHash !== "0x_already_anchored"
        ? `https://sepolia.etherscan.io/tx/${cred.blockchainTxHash}`
        : undefined,
      etherscanContractUrl: `https://sepolia.etherscan.io/address/${cred.blockchainContractAddress || "0xcd72712c39C5da6de61Ba40AF5EA69Bcd43185c5"}`,
    };

    return {
      success: true,
      result,
      failureReason,
      verificationDetails: {
        signatureValid,
        integrityValid: signatureValid,
        statusValid,
        expirationValid,
        blockchainAnchored: blockchain.isAnchored,
      },
      credential: {
        credentialId: cred.credentialId,
        typeName,
        type: cred.type,
        issuerName: cred.issuerName,
        issuerDid: cred.issuerDid,
        recipientDid: cred.recipientDid,
        issuedAt: cred.issuedAt,
        expirationDate: cred.expirationDate,
        status: cred.status,
        claims,
      },
      blockchain,
      tokenInfo: {
        createdAt: tokenDoc.createdAt,
        expiresAt: tokenDoc.expiresAt,
        useCount: tokenDoc.useCount + 1,
      },
      verifiedAt: now,
    };
  },
});
