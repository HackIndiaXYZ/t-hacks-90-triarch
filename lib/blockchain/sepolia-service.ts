import { ethers } from "ethers";
import anchorArtifact from "./anchor-contract.json";

export interface AnchorResult {
  success: boolean;
  credentialHash: string;
  transactionHash?: string;
  blockNumber?: number;
  contractAddress: string;
  network: string;
  chainId: number;
  anchoredAt: number;
  anchoredBy?: string;
  alreadyAnchored?: boolean;
  failureReason?: string;
}

export interface VerifyAnchorResult {
  isAnchored: boolean;
  credentialHash: string;
  anchoredAt?: number;
  anchoredBy?: string;
  contractAddress: string;
  network: string;
  chainId: number;
  etherscanAddressUrl: string;
  etherscanTxUrl?: string;
}

const SEPOLIA_CHAIN_ID = 11155111;
const DEFAULT_SEPOLIA_RPC = "https://rpc.sepolia.org";

/**
 * Computes a deterministic 32-byte cryptographic SHA-256 hash of a signed W3C Verifiable Credential.
 */
export function computeCredentialHash(rawVcJson: string): string {
  if (!rawVcJson || typeof rawVcJson !== "string") {
    throw new Error("Invalid rawVcJson provided for cryptographic hashing.");
  }
  // Standard SHA-256 hash of UTF-8 encoded canonical JSON
  const hash = ethers.sha256(ethers.toUtf8Bytes(rawVcJson.trim()));
  return hash;
}

function getContractAddress(): string {
  const envAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (envAddress && ethers.isAddress(envAddress)) {
    return envAddress;
  }
  if (anchorArtifact.address && ethers.isAddress(anchorArtifact.address)) {
    return anchorArtifact.address;
  }
  throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not configured or invalid.");
}

function getRpcUrl(): string {
  return process.env.BLOCKCHAIN_RPC_URL || DEFAULT_SEPOLIA_RPC;
}

function getPrivateKey(): string {
  let pk = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
  if (!pk) {
    throw new Error("BLOCKCHAIN_PRIVATE_KEY is missing in server environment.");
  }
  if (!pk.startsWith("0x")) {
    pk = "0x" + pk;
  }
  if (pk.length !== 66) {
    throw new Error("BLOCKCHAIN_PRIVATE_KEY must be a valid 32-byte hex string (64 hex characters).");
  }
  return pk;
}

/**
 * Server-only: Submits a cryptographic credential hash to Ethereum Sepolia.
 */
export async function anchorCredentialToSepolia(rawVcJson: string): Promise<AnchorResult> {
  const credentialHash = computeCredentialHash(rawVcJson);
  const contractAddress = getContractAddress();
  const rpcUrl = getRpcUrl();
  const privateKey = getPrivateKey();

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();

  if (network.chainId !== BigInt(SEPOLIA_CHAIN_ID)) {
    console.warn(`[Blockchain] Connected to chainId ${network.chainId.toString()}, expected ${SEPOLIA_CHAIN_ID} (Sepolia)`);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, anchorArtifact.abi, wallet);

  // 1. Check if already anchored on-chain (Idempotency check)
  try {
    const [exists, timestamp, anchoredBy] = await contract.getAnchor(credentialHash);
    if (exists) {
      return {
        success: true,
        alreadyAnchored: true,
        credentialHash,
        contractAddress,
        network: "sepolia",
        chainId: SEPOLIA_CHAIN_ID,
        anchoredAt: Number(timestamp) * 1000,
        anchoredBy,
      };
    }
  } catch (readErr) {
    console.warn("[Blockchain] Could not check pre-existing anchor status:", readErr);
  }

  // 2. Broadcast anchor transaction
  try {
    const tx = await contract.anchorCredential(credentialHash);
    const receipt = await tx.wait(1);

    if (!receipt || receipt.status !== 1) {
      throw new Error(`Transaction reverted on-chain. TxHash: ${tx.hash}`);
    }

    const block = await provider.getBlock(receipt.blockNumber);
    const blockTimestamp = block ? block.timestamp * 1000 : Date.now();

    return {
      success: true,
      credentialHash,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      contractAddress,
      network: "sepolia",
      chainId: SEPOLIA_CHAIN_ID,
      anchoredAt: blockTimestamp,
      anchoredBy: wallet.address,
    };
  } catch (txErr: unknown) {
    console.error("[Blockchain] Anchor transaction failed:", txErr);
    const errorMsg = txErr instanceof Error ? txErr.message : String(txErr);
    throw new Error(`Blockchain anchor transaction failed: ${errorMsg}`);
  }
}

/**
 * Read-only: Queries Ethereum Sepolia to verify if a credential hash is anchored.
 */
export async function verifySepoliaAnchor(rawVcJson: string): Promise<VerifyAnchorResult> {
  const credentialHash = computeCredentialHash(rawVcJson);
  const contractAddress = getContractAddress();
  const rpcUrl = getRpcUrl();

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, anchorArtifact.abi, provider);

  const etherscanAddressUrl = `https://sepolia.etherscan.io/address/${contractAddress}`;

  try {
    const [exists, timestamp, anchoredBy] = await contract.getAnchor(credentialHash);

    return {
      isAnchored: Boolean(exists),
      credentialHash,
      anchoredAt: exists ? Number(timestamp) * 1000 : undefined,
      anchoredBy: exists && anchoredBy !== ethers.ZeroAddress ? anchoredBy : undefined,
      contractAddress,
      network: "sepolia",
      chainId: SEPOLIA_CHAIN_ID,
      etherscanAddressUrl,
    };
  } catch (err) {
    console.error("[Blockchain] Anchor verification query failed:", err);
    return {
      isAnchored: false,
      credentialHash,
      contractAddress,
      network: "sepolia",
      chainId: SEPOLIA_CHAIN_ID,
      etherscanAddressUrl,
    };
  }
}
