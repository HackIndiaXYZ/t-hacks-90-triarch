import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const UserRole = v.union(
  v.literal("user"),
  v.literal("issuer"),
  v.literal("verifier"),
  v.literal("admin")
);

export const RoleRequestStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

export const RequestedRole = v.union(
  v.literal("issuer"),
  v.literal("verifier")
);

export const CredentialStatus = v.union(
  v.literal("active"),
  v.literal("revoked")
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: UserRole,
    onboardingCompleted: v.optional(v.boolean()),
    did: v.optional(v.string()),
    publicKey: v.optional(v.string()),
    keyType: v.optional(v.string()),
    didCreatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_did", ["did"]),

  roleRequests: defineTable({
    userId: v.id("users"),
    clerkId: v.string(),
    requestedRole: RequestedRole,
    organizationName: v.string(),
    organizationType: v.optional(v.string()),
    website: v.optional(v.string()),
    contactEmail: v.string(),
    useCaseDescription: v.string(),
    status: RoleRequestStatus,
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_clerkId", ["clerkId"])
    .index("by_status", ["status"]),

  credentials: defineTable({
    credentialId: v.string(), // e.g. urn:uuid:...
    type: v.array(v.string()), // ["VerifiableCredential", "EmploymentCredential", ...]
    issuerDid: v.string(), // did:key:z...
    issuerName: v.string(), // Organization or Authority Name
    issuerUserId: v.id("users"),
    recipientDid: v.string(), // did:key:z...
    recipientUserId: v.id("users"),
    credentialData: v.any(), // Structured claims
    issuedAt: v.number(),
    expirationDate: v.optional(v.number()),
    status: CredentialStatus,
    revokedAt: v.optional(v.number()),
    revocationReason: v.optional(v.string()),
    rawVcJson: v.string(), // Complete signed W3C JSON string
    proof: v.object({
      type: v.string(),
      created: v.string(),
      proofPurpose: v.string(),
      verificationMethod: v.string(),
      jws: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_credentialId", ["credentialId"])
    .index("by_recipientDid", ["recipientDid"])
    .index("by_recipientUserId", ["recipientUserId"])
    .index("by_issuerDid", ["issuerDid"])
    .index("by_issuerUserId", ["issuerUserId"])
    .index("by_status", ["status"]),
});
