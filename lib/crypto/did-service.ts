import { generateDidKey } from "./did-key";
import { storeKeyRecord, getKeyRecordByUserId, hasLocalKey } from "./keystore";

export interface ProvisionDidResult {
  did: string;
  publicKey: string;
  keyType: string;
  isExisting: boolean;
  hasLocalPrivateKey: boolean;
}

/**
 * Provisions a real cryptographic W3C did:key identity for the authenticated user.
 *
 * Security Guarantee:
 * - Private key is generated via Web Crypto API (ECDSA P-256) inside the browser.
 * - Private key is stored ONLY in local browser IndexedDB.
 * - Only the public DID identifier, public key hex, and algorithm type are passed to Convex.
 * - Private key is NEVER sent over the network or stored in Convex.
 */
export async function provisionUserDid(
  userId: string,
  existingConvexDid?: string | null,
  registerDidMutation?: (args: { did: string; publicKey: string; keyType: string }) => Promise<unknown>
): Promise<ProvisionDidResult> {
  // 1. Idempotency Check: User already has a registered DID
  if (existingConvexDid && existingConvexDid.startsWith("did:key:")) {
    const hasKey = await hasLocalKey(userId);
    const localRecord = await getKeyRecordByUserId(userId);

    return {
      did: existingConvexDid,
      publicKey: localRecord?.publicKeyHex || "",
      keyType: localRecord?.keyType || "ECDSA-P256",
      isExisting: true,
      hasLocalPrivateKey: hasKey,
    };
  }

  // 2. Check if local IndexedDB already has a keypair for this user
  const localRecord = await getKeyRecordByUserId(userId);
  if (localRecord && localRecord.did) {
    if (registerDidMutation) {
      await registerDidMutation({
        did: localRecord.did,
        publicKey: localRecord.publicKeyHex,
        keyType: localRecord.keyType,
      });
    }

    return {
      did: localRecord.did,
      publicKey: localRecord.publicKeyHex,
      keyType: localRecord.keyType,
      isExisting: false,
      hasLocalPrivateKey: true,
    };
  }

  // 3. Generate a fresh real cryptographic keypair via Web Crypto API
  const generated = await generateDidKey();

  // 4. Store private key and metadata securely in IndexedDB
  await storeKeyRecord({
    userId,
    did: generated.did,
    keyType: generated.keyType,
    publicKeyHex: generated.publicKeyHex,
    publicKeyJwk: generated.publicKeyJwk,
    privateKey: generated.privateKey,
    publicKey: generated.publicKey,
    createdAt: generated.createdAt,
  });

  // 5. Register ONLY public key metadata and DID in Convex database
  if (registerDidMutation) {
    await registerDidMutation({
      did: generated.did,
      publicKey: generated.publicKeyHex,
      keyType: generated.keyType,
    });
  }

  return {
    did: generated.did,
    publicKey: generated.publicKeyHex,
    keyType: generated.keyType,
    isExisting: false,
    hasLocalPrivateKey: true,
  };
}
