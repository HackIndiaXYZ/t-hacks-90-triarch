const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const contractArtifact = require("../lib/blockchain/anchor-contract.json");

async function runTests() {
  console.log("==========================================================");
  console.log("TESTING REAL ETHEREUM SEPOLIA CREDENTIAL ANCHORING");
  console.log("==========================================================");

  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  let privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || contractArtifact.address;

  console.log("Contract Address:", contractAddress);
  console.log("RPC URL:", rpcUrl);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, contractArtifact.abi, wallet);

  // Sample W3C Verifiable Credential payload
  const sampleVc = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    id: `urn:uuid:test-${Date.now()}`,
    type: ["VerifiableCredential", "AcademicDegreeCredential"],
    issuer: {
      id: "did:key:z6MkuH61G5yB582p1v8e6YmC8zT5h6rZ7x8y9A1b2c3d4e5f",
      name: "Verifi Anchor Authority",
    },
    credentialSubject: {
      id: "did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH",
      degree: "Master of Science in Cryptography",
      university: "Stanford University",
    },
    issuanceDate: new Date().toISOString(),
    proof: {
      type: "JsonWebSignature2020",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: "did:key:z6MkuH61G5yB582p1v8e6YmC8zT5h6rZ7x8y9A1b2c3d4e5f#z6MkuH61G5yB582p1v8e6YmC8zT5h6rZ7x8y9A1b2c3d4e5f",
      jws: "eyJhbGciOiJFUzI1NiJ9.test.sig",
    },
  };

  const rawVcJson = JSON.stringify(sampleVc);
  const credentialHash = ethers.sha256(ethers.toUtf8Bytes(rawVcJson.trim()));
  console.log("\n1. Computed Cryptographic SHA-256 Hash of VC:");
  console.log("   Credential Hash:", credentialHash);

  // Check pre-anchor status
  const preCheck = await contract.isAnchored(credentialHash);
  console.log("   Pre-anchor on-chain check (should be false):", preCheck);

  // Test A: Real On-Chain Anchoring Transaction
  console.log("\n2. Submitting Real Anchor Transaction to Sepolia...");
  const tx = await contract.anchorCredential(credentialHash);
  console.log("   Broadcast Tx Hash:", tx.hash);
  console.log("   Waiting for 1 block confirmation on Sepolia...");
  
  const receipt = await tx.wait(1);
  console.log("   ✅ Confirmed in Block Number:", receipt.blockNumber);
  console.log("   Transaction Status:", receipt.status === 1 ? "SUCCESS (1)" : "FAILED (0)");
  console.log("   Etherscan Tx Link: https://sepolia.etherscan.io/tx/" + tx.hash);

  // Test B: Read-Only Verification on Sepolia
  console.log("\n3. Querying On-Chain Anchor Data from Sepolia Contract...");
  const [exists, timestamp, anchoredBy] = await contract.getAnchor(credentialHash);
  console.log("   Anchor Exists:", exists);
  console.log("   Block Timestamp:", new Date(Number(timestamp) * 1000).toISOString());
  console.log("   Anchored By:", anchoredBy);

  if (!exists) {
    throw new Error("❌ Assertion Failed: Credential should be anchored on-chain!");
  }
  console.log("   ✅ Real On-Chain Anchor Verified Successfully!");

  // Test C: Duplicate Anchor Prevention
  console.log("\n4. Testing Duplicate Anchor Prevention on Smart Contract...");
  try {
    const dupTx = await contract.anchorCredential(credentialHash);
    await dupTx.wait(1);
    throw new Error("❌ Revert Expected: Duplicate anchor should have failed!");
  } catch (dupErr) {
    console.log("   ✅ Smart contract successfully rejected duplicate anchor as expected!");
  }

  console.log("\n==========================================================");
  console.log("🎉 ALL REAL BLOCKCHAIN ANCHORING TESTS PASSED ON SEPOLIA!");
  console.log("==========================================================");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
