/**
 * Application Configuration
 *
 * Centralizes environment variable access with strict safety guarantees.
 * NOTE: Private keys and server secrets are never exposed on the client.
 * In Step 1, integrations are not active yet, so values default gracefully without throwing.
 */

export const config = {
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    isProduction: process.env.NODE_ENV === "production",
  },
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
    // Server-only access:
    get secretKey() {
      if (typeof window !== "undefined") {
        throw new Error("CLERK_SECRET_KEY cannot be accessed in browser runtime.");
      }
      return process.env.CLERK_SECRET_KEY || "";
    },
  },
  convex: {
    url: process.env.NEXT_PUBLIC_CONVEX_URL || "",
  },
  blockchain: {
    network: process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK || "",
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "",
    // Server-only access:
    get rpcUrl() {
      if (typeof window !== "undefined") {
        throw new Error("BLOCKCHAIN_RPC_URL cannot be accessed in browser runtime.");
      }
      return process.env.BLOCKCHAIN_RPC_URL || "";
    },
    get privateKey() {
      if (typeof window !== "undefined") {
        throw new Error("BLOCKCHAIN_PRIVATE_KEY cannot be accessed in browser runtime.");
      }
      return process.env.BLOCKCHAIN_PRIVATE_KEY || "";
    },
  },
  trustIdApi: {
    // Server-only access:
    get url() {
      if (typeof window !== "undefined") {
        throw new Error("TRUSTID_API_URL cannot be accessed in browser runtime.");
      }
      return process.env.TRUSTID_API_URL || "";
    },
    get apiKey() {
      if (typeof window !== "undefined") {
        throw new Error("TRUSTID_API_KEY cannot be accessed in browser runtime.");
      }
      return process.env.TRUSTID_API_KEY || "";
    },
  },
} as const;
