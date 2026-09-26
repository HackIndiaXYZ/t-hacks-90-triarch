/**
 * W3C Verifiable Credential Cryptographic Verifier (Convex Server Enclave)
 *
 * Implements pure ECDSA P-256 (SHA-256) signature verification, NIST P-256 curve point decompression,
 * Base58-BTC decoding, and canonical JSON-LD document verification in the Convex runtime.
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ALPHABET_MAP: { [char: string]: number } = {};
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_MAP[ALPHABET.charAt(i)] = i;
}

export function decodeBase58(string: string): Uint8Array {
  if (string.length === 0) return new Uint8Array(0);
  const bytes = [0];
  for (let i = 0; i < string.length; i++) {
    const c = string[i];
    if (!(c in ALPHABET_MAP)) {
      throw new Error(`Non-base58 character: ${c}`);
    }
    for (let j = 0; j < bytes.length; j++) {
      bytes[j] *= 58;
    }
    bytes[0] += ALPHABET_MAP[c];
    let carry = 0;
    for (let j = 0; j < bytes.length; ++j) {
      bytes[j] += carry;
      carry = bytes[j] >> 8;
      bytes[j] &= 0xff;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < string.length && string[i] === ALPHABET[0]; i++) {
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

const P = BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff");
const A = BigInt(-3);
const B = BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b");
const ZERO = BigInt(0);
const ONE = BigInt(1);
const FOUR = BigInt(4);
const EIGHT = BigInt(8);
const FF = BigInt(0xff);

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let res = ONE;
  base = ((base % mod) + mod) % mod;
  while (exp > ZERO) {
    if (exp & ONE) res = (res * base) % mod;
    base = (base * base) % mod;
    exp >>= ONE;
  }
  return res;
}

export function decompressP256(compressed: Uint8Array): Uint8Array {
  if (compressed.length !== 33) {
    throw new Error(`Invalid compressed key length: ${compressed.length}, expected 33 bytes`);
  }
  const prefix = compressed[0];
  if (prefix !== 2 && prefix !== 3) {
    throw new Error(`Invalid compression prefix: ${prefix}, expected 0x02 or 0x03`);
  }
  const xBytes = compressed.subarray(1, 33);
  let x = ZERO;
  for (let i = 0; i < 32; i++) {
    x = (x << EIGHT) | BigInt(xBytes[i]);
  }

  const y2 = (x * x * x + A * x + B) % P;
  let y = modPow(y2, (P + ONE) / FOUR, P);

  if ((y * y) % P !== ((y2 % P) + P) % P) {
    throw new Error("Invalid point: (X, Y) does not lie on NIST P-256 elliptic curve");
  }

  const expectedBit = BigInt(prefix & 1);
  if ((y & ONE) !== expectedBit) {
    y = P - y;
  }

  const uncompressed = new Uint8Array(65);
  uncompressed[0] = 0x04;
  uncompressed.set(xBytes, 1);

  let tempY = y;
  for (let i = 31; i >= 0; i--) {
    uncompressed[33 + i] = Number(tempY & FF);
    tempY >>= EIGHT;
  }

  return uncompressed;
}

export function decodeP256FromDidKey(did: string): Uint8Array {
  if (!did || typeof did !== "string" || !did.startsWith("did:key:z")) {
    throw new Error(`Invalid did:key identifier format: ${did}`);
  }
  const multibase = did.slice(9);
  const multicodec = decodeBase58(multibase);
  if (multicodec.length !== 35 || multicodec[0] !== 0x80 || multicodec[1] !== 0x24) {
    throw new Error(`Unsupported or malformed multicodec in DID: length ${multicodec.length}`);
  }
  const compressed = multicodec.subarray(2);
  return decompressP256(compressed);
}

export function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } else {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
}

export interface VcSignatureVerificationResult {
  isValid: boolean;
  error?: string;
  issuerDid?: string;
  subjectDid?: string;
}

export async function verifyVcSignature(
  signedVc: Record<string, unknown>
): Promise<VcSignatureVerificationResult> {
  try {
    const cryptoSubtle =
      typeof crypto !== "undefined" && crypto.subtle
        ? crypto.subtle
        : (globalThis as unknown as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;

    if (!cryptoSubtle) {
      return { isValid: false, error: "Web Crypto API (crypto.subtle) is unavailable in runtime environment." };
    }

    if (!signedVc || typeof signedVc !== "object") {
      return { isValid: false, error: "Verifiable Credential must be a valid JSON object." };
    }

    const proof = signedVc.proof as Record<string, unknown> | undefined;
    if (!proof || typeof proof !== "object" || typeof proof.jws !== "string") {
      return { isValid: false, error: "Missing cryptographic proof object or 'jws' signature string." };
    }

    const issuer = signedVc.issuer as { id?: string } | string | undefined;
    const issuerDid =
      typeof issuer === "object" && issuer !== null
        ? issuer.id
        : typeof issuer === "string"
        ? issuer
        : undefined;

    if (!issuerDid || !issuerDid.startsWith("did:key:z")) {
      return { isValid: false, error: `Invalid or missing issuer did:key identifier: ${issuerDid}` };
    }

    const credentialSubject = signedVc.credentialSubject as Record<string, unknown> | undefined;
    const subjectDid =
      credentialSubject && typeof credentialSubject === "object" && typeof credentialSubject.id === "string"
        ? credentialSubject.id
        : undefined;

    // 1. Decode public key from issuer's DID
    const uncompressedPublicKey = decodeP256FromDidKey(issuerDid);

    // 2. Import public key into Web Crypto
    const cryptoKey = await cryptoSubtle.importKey(
      "raw",
      uncompressedPublicKey.buffer as ArrayBuffer,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );

    // 3. Reconstruct canonical payload without the proof block
    const payload: Record<string, unknown> = {
      "@context": signedVc["@context"],
      id: signedVc.id,
      type: signedVc.type,
      issuer: signedVc.issuer,
      issuanceDate: signedVc.issuanceDate,
    };
    if (signedVc.expirationDate) {
      payload.expirationDate = signedVc.expirationDate;
    }
    payload.credentialSubject = signedVc.credentialSubject;

    const canonicalString = JSON.stringify(payload);
    const dataToVerify = new TextEncoder().encode(canonicalString);
    const signatureBytes = base64UrlToBuffer(proof.jws);

    // 4. Cryptographic ECDSA signature verification
    const isValid = await cryptoSubtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      cryptoKey,
      signatureBytes.buffer as ArrayBuffer,
      dataToVerify.buffer as ArrayBuffer
    );

    return {
      isValid,
      error: isValid ? undefined : "Cryptographic signature validation failed: Document content or signature has been modified.",
      issuerDid,
      subjectDid,
    };
  } catch (err: unknown) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
