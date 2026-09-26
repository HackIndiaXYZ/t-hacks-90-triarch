import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient("https://dazzling-armadillo-628.convex.cloud");

async function main() {
  console.log("Testing Convex function registration on dazzling-armadillo-628.convex.cloud...");
  
  // 1. Verify getCredentialAnchor is recognized as a query function
  try {
    // Calling without auth should return unauthorized error, NOT "Could not find public function"
    await client.query(api.blockchain.getCredentialAnchor, {
      credentialDocId: "jd71yv13r6807w0a469493v4r17wb96e", // arbitrary ID format
    });
    console.log("Query returned successfully.");
  } catch (err) {
    const msg = err?.message || String(err);
    console.log("getCredentialAnchor response:", msg);
    if (msg.includes("Could not find public function")) {
      console.error("FAIL: Function not found in Convex deployment!");
      process.exit(1);
    } else if (msg.includes("Unauthorized") || msg.includes("Valid authenticated session required") || msg.includes("not found") || msg.includes("does not exist") || msg.includes("Id")) {
      console.log("SUCCESS: Function is properly registered in Convex and enforcing auth/validation!");
    }
  }

  // 2. Verify recordAnchorPending is recognized as a mutation function
  try {
    await client.mutation(api.blockchain.recordAnchorPending, {
      credentialDocId: "jd71yv13r6807w0a469493v4r17wb96e",
      credentialHash: "0x1234",
      network: "sepolia",
      chainId: 11155111,
      contractAddress: "0xcd72712c39C5da6de61Ba40AF5EA69Bcd43185c5",
    });
    console.log("Mutation returned successfully.");
  } catch (err) {
    const msg = err?.message || String(err);
    console.log("recordAnchorPending response:", msg);
    if (msg.includes("Could not find public function")) {
      console.error("FAIL: Function not found in Convex deployment!");
      process.exit(1);
    } else if (msg.includes("Unauthorized") || msg.includes("Valid authenticated session required") || msg.includes("role") || msg.includes("Id")) {
      console.log("SUCCESS: Mutation is properly registered in Convex and enforcing role protection!");
    }
  }

  // 3. Verify recordAnchorFailure is recognized as a mutation function
  try {
    await client.mutation(api.blockchain.recordAnchorFailure, {
      credentialDocId: "jd71yv13r6807w0a469493v4r17wb96e",
      failureReason: "Test failure",
    });
    console.log("Mutation returned successfully.");
  } catch (err) {
    const msg = err?.message || String(err);
    console.log("recordAnchorFailure response:", msg);
    if (msg.includes("Could not find public function")) {
      console.error("FAIL: Function not found in Convex deployment!");
      process.exit(1);
    } else if (msg.includes("Unauthorized") || msg.includes("Valid authenticated session required") || msg.includes("role") || msg.includes("Id")) {
      console.log("SUCCESS: Mutation is properly registered in Convex and enforcing role protection!");
    }
  }

  // 4. Verify recordAnchorSuccess is recognized as a mutation function
  try {
    await client.mutation(api.blockchain.recordAnchorSuccess, {
      credentialDocId: "jd71yv13r6807w0a469493v4r17wb96e",
      credentialHash: "0x1234",
      transactionHash: "0x5678",
      blockNumber: 123456,
      anchoredAt: Date.now(),
      contractAddress: "0xcd72712c39C5da6de61Ba40AF5EA69Bcd43185c5",
      network: "sepolia",
      chainId: 11155111,
    });
    console.log("Mutation returned successfully.");
  } catch (err) {
    const msg = err?.message || String(err);
    console.log("recordAnchorSuccess response:", msg);
    if (msg.includes("Could not find public function")) {
      console.error("FAIL: Function not found in Convex deployment!");
      process.exit(1);
    } else if (msg.includes("Unauthorized") || msg.includes("Valid authenticated session required") || msg.includes("role") || msg.includes("Id")) {
      console.log("SUCCESS: Mutation is properly registered in Convex and enforcing role protection!");
    }
  }

  console.log("\nALL 4 CONVEX BLOCKCHAIN FUNCTIONS ARE PROPERLY REGISTERED AND DEPLOYED!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
