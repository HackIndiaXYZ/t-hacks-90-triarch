import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const UserRole = v.union(
  v.literal("user"),
  v.literal("issuer"),
  v.literal("verifier")
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    role: UserRole,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerkId", ["clerkId"]),
});
