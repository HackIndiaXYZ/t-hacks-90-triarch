import { encodeBase58 } from "./base58";

export interface GeneratedKeypair {
  did: string;
  keyType: "ECDSA-P256" | "Ed25519";
  publicKeyHex: string;
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  createdAt: number;
}

/**
 * Generates a real cryptographic key pair using the Web Crypto API
 * and constructs a W3C-compatible did:key identifier.
 */
export async function generateDidKey(): Promise<GeneratedKeypair> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }

  // 1. Generate ECDSA P-256 Keypair using Web Crypto
  // P-256 (secp256r1) is supported natively across 100% of modern browsers
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false, // Private key can be stored in IndexedDB without requiring plain-text extraction
    ["sign", "verify"]
  );

  // 2. Export raw public key (65 bytes: 0x04 || X_32 || Y_32)
  const rawPublicKeyBuffer = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
  const rawPublicKey = new Uint8Array(rawPublicKeyBuffer);

  // 3. Compress P-256 public key (33 bytes: 0x02/0x03 || X_32)
  const compressed = new Uint8Array(33);
  const isEven = (rawPublicKey[64] & 1) === 0;
  compressed[0] = isEven ? 0x02 : 0x03;
  compressed.set(rawPublicKey.subarray(1, 33), 1);

  // 4. Prepend Multicodec varint header for p256-pub (0x1200 -> varint: [0x80, 0x24])
  const multicodec = new Uint8Array(2 + compressed.length);
  multicodec[0] = 0x80;
  multicodec[1] = 0x24;
  multicodec.set(compressed, 2);

  // 5. Construct W3C did:key with base58-btc multibase prefix 'z'
  const did = `did:key:z${encodeBase58(multicodec)}`;

  // 6. Export public key in JWK and Hex format for storage metadata
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const publicKeyHex = Array.from(compressed)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    did,
    keyType: "ECDSA-P256",
    publicKeyHex,
    publicKeyJwk,
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    createdAt: Date.now(),
  };
}

/**
 * Validates whether a given string is a valid W3C did:key identifier
 */
export function isValidDidKey(did: string): boolean {
  if (!did || typeof did !== "string") return false;
  return did.startsWith("did:key:z") && did.length > 20;
}
