import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, getAuthenticatedUser } from "./lib/auth";
import { verifyVcSignature } from "./lib/vcVerifier";

/**
 * verifyVerifiableCredential
 *
 * Authoritative backend cryptographic verification mutation for W3C Verifiable Credentials.
 * - Access Control: Strictly restricted to 'verifier' or 'admin' roles.
 * - Server-Side Execution: Never trusts client-side assertions.
 * - Validates:
 *   1. W3C JSON structure & syntax
 *   2. Issuer identity and DID format
 *   3. Subject/Recipient DID format
 *   4. Cryptographic ECDSA P-256 digital signature & document integrity (tamper detection)
 *   5. Expiration date
 *   6. Revocation status in Convex database
 * - Audit Trail: Records every verification attempt in the Convex `verifications` table.
 */
export const verifyVerifiableCredential = mutation({
  args: {
    rawVcJson: v.string(),
    credentialDocId: v.optional(v.id("credentials")),
    blockchainVerification: v.optional(
      v.object({
        isAnchored: v.boolean(),
        credentialHash: v.string(),
        contractAddress: v.string(),
        network: v.string(),
        chainId: v.number(),
        anchoredAt: v.optional(v.number()),
        anchoredBy: v.optional(v.string()),
        txHash: v.optional(v.string()),
        blockNumber: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // 1. Enforce Role-Based Access Control (RBAC)
    const verifierUser = await requireRole(ctx, ["verifier", "admin"]);
    const now = Date.now();

    let parsedVc: Record<string, unknown> | null = null;
    let failureReason: string | undefined = undefined;
    let signatureValid = false;
    let integrityValid = false;
    let statusValid = true;
    let expirationValid = true;
    let credentialId = "urn:uuid:unknown";
    let credentialType: string[] = ["VerifiableCredential"];
    let issuerDid = "";
    let issuerName = "Unknown Issuer";
    let recipientDid = "";
    let claimsSummary: Record<string, unknown> = {};

    // 2. Parse JSON-LD structure
    try {
      parsedVc = JSON.parse(args.rawVcJson);
    } catch {
      failureReason = "Invalid JSON syntax: Unable to parse credential document.";
    }

    if (parsedVc && typeof parsedVc === "object") {
      credentialId = typeof parsedVc.id === "string" ? parsedVc.id : credentialId;
      credentialType = Array.isArray(parsedVc.type) ? (parsedVc.type as string[]) : credentialType;

      const issuerObj = parsedVc.issuer as { id?: string; name?: string } | string | undefined;
      if (typeof issuerObj === "object" && issuerObj !== null) {
        issuerDid = issuerObj.id || "";
        issuerName = issuerObj.name || "Unknown Issuer";
      } else if (typeof issuerObj === "string") {
        issuerDid = issuerObj;
      }

      const subjectObj = parsedVc.credentialSubject as Record<string, unknown> | undefined;
      if (subjectObj && typeof subjectObj === "object") {
        recipientDid = typeof subjectObj.id === "string" ? subjectObj.id : "";
        const restClaims = { ...subjectObj };
        delete restClaims.id;
        claimsSummary = restClaims;
      }

      const proofObj = parsedVc.proof as Record<string, unknown> | undefined;
      if (!parsedVc["@context"] || !Array.isArray(parsedVc["@context"])) {
        failureReason = "Missing or invalid W3C @context declaration.";
      } else if (!parsedVc.id || typeof parsedVc.id !== "string") {
        failureReason = "Missing or invalid credential 'id' URI.";
      } else if (!parsedVc.type || !Array.isArray(parsedVc.type)) {
        failureReason = "Missing or invalid credential 'type' array.";
      } else if (!issuerDid || !issuerDid.startsWith("did:key:z")) {
        failureReason = `Invalid issuer DID format: '${issuerDid}'. Expected valid W3C did:key.`;
      } else if (!recipientDid || !recipientDid.startsWith("did:key:z")) {
        failureReason = `Invalid recipient subject DID format: '${recipientDid}'. Expected valid W3C did:key.`;
      } else if (!proofObj || typeof proofObj !== "object" || typeof proofObj.jws !== "string") {
        failureReason = "Missing cryptographic proof or digital signature (proof.jws).";
      } else {
        // 4. Cryptographic digital signature and document integrity verification
        const cryptoResult = await verifyVcSignature(parsedVc);
        signatureValid = cryptoResult.isValid;
        integrityValid = cryptoResult.isValid;

        if (!cryptoResult.isValid) {
          failureReason = cryptoResult.error || "Cryptographic signature validation failed. Document content has been tampered with or modified.";
        }
      }
    }

    // 5. Expiration Check
    if (parsedVc && parsedVc.expirationDate) {
      const expVal = parsedVc.expirationDate;
      const expTime = typeof expVal === "string" || typeof expVal === "number" ? new Date(expVal).getTime() : NaN;
      if (!isNaN(expTime) && expTime < now) {
        expirationValid = false;
        if (!failureReason) {
          failureReason = `Credential expired on ${new Date(expTime).toUTCString()}.`;
        }
      }
    }

    // 6. Revocation & Database Status Check
    let matchingCredDoc = null;
    if (args.credentialDocId) {
      matchingCredDoc = await ctx.db.get(args.credentialDocId);
    }
    if (!matchingCredDoc && credentialId && credentialId !== "urn:uuid:unknown") {
      matchingCredDoc = await ctx.db
        .query("credentials")
        .withIndex("by_credentialId", (q) => q.eq("credentialId", credentialId))
        .first();
    }

    if (matchingCredDoc) {
      if (matchingCredDoc.status === "revoked") {
        statusValid = false;
        if (!failureReason) {
          failureReason = `Credential was revoked by issuing authority on ${matchingCredDoc.revokedAt ? new Date(matchingCredDoc.revokedAt).toUTCString() : "unknown date"}. Reason: ${matchingCredDoc.revocationReason || "Revoked by issuer"}`;
        }
      }
    }

    // 7. Blockchain Sepolia Anchor Check
    let blockchainAnchored = false;
    let blockchainCredentialHash: string | undefined = undefined;
    let blockchainContractAddress: string | undefined = undefined;
    let blockchainTxHash: string | undefined = undefined;
    let blockchainBlockNumber: number | undefined = undefined;
    let blockchainNetwork: string | undefined = undefined;
    let blockchainAnchoredAt: number | undefined = undefined;

    if (args.blockchainVerification?.isAnchored) {
      blockchainAnchored = true;
      blockchainCredentialHash = args.blockchainVerification.credentialHash;
      blockchainContractAddress = args.blockchainVerification.contractAddress;
      blockchainNetwork = args.blockchainVerification.network;
      blockchainAnchoredAt = args.blockchainVerification.anchoredAt;
      blockchainTxHash = args.blockchainVerification.txHash || matchingCredDoc?.blockchainTxHash;
      blockchainBlockNumber = args.blockchainVerification.blockNumber || matchingCredDoc?.blockchainBlockNumber;
    } else if (matchingCredDoc?.blockchainAnchorStatus === "ANCHORED") {
      blockchainAnchored = true;
      blockchainCredentialHash = matchingCredDoc.blockchainCredentialHash;
      blockchainContractAddress = matchingCredDoc.blockchainContractAddress;
      blockchainTxHash = matchingCredDoc.blockchainTxHash;
      blockchainBlockNumber = matchingCredDoc.blockchainBlockNumber;
      blockchainNetwork = matchingCredDoc.blockchainNetwork || "sepolia";
      blockchainAnchoredAt = matchingCredDoc.blockchainAnchoredAt;
    }

    // 8. Determine Final Authoritative Verification Result
    let result: "VERIFIED" | "INVALID" | "REVOKED" | "EXPIRED" = "VERIFIED";

    if (!signatureValid || !integrityValid || !parsedVc || failureReason?.includes("Invalid") || failureReason?.includes("Missing") || failureReason?.includes("tampered")) {
      result = "INVALID";
    } else if (!statusValid) {
      result = "REVOKED";
    } else if (!expirationValid) {
      result = "EXPIRED";
    } else {
      result = "VERIFIED";
    }

    // 9. Store verification attempt in Convex Activity/Audit Log
    const verificationRecordId = await ctx.db.insert("verifications", {
      verifierUserId: verifierUser._id,
      verifierClerkId: verifierUser.clerkId,
      verifierRole: verifierUser.role,
      credentialId,
      credentialDocId: matchingCredDoc?._id || args.credentialDocId,
      credentialType,
      issuerDid,
      issuerName,
      recipientDid,
      result,
      signatureValid,
      integrityValid,
      statusValid,
      expirationValid,
      failureReason,
      claimsSummary,
      blockchainAnchored,
      blockchainCredentialHash,
      blockchainContractAddress,
      blockchainTxHash,
      blockchainBlockNumber,
      blockchainNetwork,
      blockchainAnchoredAt,
      verifiedAt: now,
    });

    return {
      verificationId: verificationRecordId,
      result,
      credentialId,
      credentialType,
      issuer: {
        did: issuerDid,
        name: issuerName,
      },
      subjectDid: recipientDid,
      issuanceDate: parsedVc?.issuanceDate || null,
      expirationDate: parsedVc?.expirationDate || null,
      claims: claimsSummary,
      signatureValid,
      integrityValid,
      statusValid,
      expirationValid,
      failureReason,
      blockchain: {
        anchored: blockchainAnchored,
        credentialHash: blockchainCredentialHash,
        contractAddress: blockchainContractAddress,
        txHash: blockchainTxHash,
        blockNumber: blockchainBlockNumber,
        network: blockchainNetwork || "sepolia",
        anchoredAt: blockchainAnchoredAt,
      },
      verifiedAt: now,
      verifier: {
        id: verifierUser._id,
        name: verifierUser.name || `@${verifierUser.username}` || verifierUser.email,
        role: verifierUser.role,
      },
    };
  },
});

/**
 * getVerificationHistory
 *
 * Fetches recent verification audits for the verifier or admin console.
 */
export const getVerificationHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["verifier", "admin"]);
    const maxLimit = args.limit || 50;

    let verifications;
    if (user.role === "admin") {
      verifications = await ctx.db
        .query("verifications")
        .withIndex("by_verifiedAt")
        .order("desc")
        .take(maxLimit);
    } else {
      verifications = await ctx.db
        .query("verifications")
        .withIndex("by_verifierUserId", (q) => q.eq("verifierUserId", user._id))
        .order("desc")
        .take(maxLimit);
    }

    return verifications;
  },
});

/**
 * getAvailableCredentialsForVerifier
 *
 * Retrieves all real credentials issued in the system for testing and verification by authorized verifiers.
 */
export const getAvailableCredentialsForVerifier = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["verifier", "admin"]);

    const creds = await ctx.db.query("credentials").collect();

    const enriched = await Promise.all(
      creds.map(async (c) => {
        const recipient = await ctx.db.get(c.recipientUserId);
        const issuer = await ctx.db.get(c.issuerUserId);
        return {
          ...c,
          recipientUser: recipient
            ? {
                name: recipient.name,
                username: recipient.username,
                email: recipient.email,
              }
            : null,
          issuerUser: issuer
            ? {
                name: issuer.name,
                username: issuer.username,
              }
            : null,
        };
      })
    );

    return enriched.sort((a, b) => b.issuedAt - a.issuedAt);
  },
});

/**
 * getAuditLogs
 *
 * Retrieves activity audit logs:
 * - For normal users: verifications of credentials issued to their DID.
 * - For verifiers: verifications they performed.
 * - For admins: all platform verifications.
 */
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthenticatedUser(ctx);
    if (!auth || !auth.user) {
      return [];
    }
    const user = auth.user;
    const maxLimit = args.limit || 30;

    if (user.role === "admin") {
      return await ctx.db
        .query("verifications")
        .withIndex("by_verifiedAt")
        .order("desc")
        .take(maxLimit);
    }

    if (user.role === "verifier") {
      return await ctx.db
        .query("verifications")
        .withIndex("by_verifierUserId", (q) => q.eq("verifierUserId", user._id))
        .order("desc")
        .take(maxLimit);
    }

    // Normal user: show verifications where recipient DID matches their registered DID
    if (user.did) {
      return await ctx.db
        .query("verifications")
        .withIndex("by_recipientDid", (q) => q.eq("recipientDid", user.did!))
        .order("desc")
        .take(maxLimit);
    }

    return [];
  },
});
