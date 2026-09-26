import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-armadillo-628.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log("==========================================================");
  console.log("TESTING REAL WEBAUTHN / PASSKEY DATA & ENCLAVE ARCHITECTURE");
  console.log("==========================================================");
  console.log(`Convex Backend: ${CONVEX_URL}`);

  // 1. Test Authentication Challenge Generation & Storage
  console.log("\n1. Testing WebAuthn Challenge Lifecycle...");
  const testChallenge = "test_challenge_" + Date.now() + "_" + Math.random().toString(36).substring(2);

  await client.mutation(api.passkeys.saveAuthenticationChallenge, {
    challenge: testChallenge,
  });
  console.log(`   Saved authentication challenge: ${testChallenge}`);

  // 2. Consume challenge
  const consumeResult = await client.mutation(api.passkeys.verifyAndConsumeChallenge, {
    challenge: testChallenge,
    purpose: "authentication",
  });
  console.log("   Consume challenge result:", consumeResult);
  if (!consumeResult.valid) {
    throw new Error("Expected challenge to be valid.");
  }
  console.log("✅ Challenge successfully verified and consumed!");

  // 3. Re-consumption should fail (Prevent Replay Attacks)
  console.log("\n2. Testing Replay Protection (Re-consuming same challenge)...");
  const replayResult = await client.mutation(api.passkeys.verifyAndConsumeChallenge, {
    challenge: testChallenge,
    purpose: "authentication",
  });
  console.log("   Replay attempt result:", replayResult);
  if (replayResult.valid) {
    throw new Error("Expected replay challenge consumption to fail.");
  }
  console.log("✅ Replay attack prevented!");

  // 4. Test Passkey Public Metadata Lookup
  console.log("\n3. Testing Passkey Public Lookup...");
  const lookup = await client.query(api.passkeys.getPasskeyByCredentialId, {
    credentialId: "non_existent_cred_id_test",
  });
  console.log("   Non-existent passkey query returned:", lookup);
  if (lookup !== null) {
    throw new Error("Expected non-existent passkey to return null.");
  }
  console.log("✅ Passkey query works as expected!");

  console.log("\n==========================================================");
  console.log("🎉 WEBAUTHN / PASSKEY DATA & API VERIFICATION PASSED!");
  console.log("==========================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
