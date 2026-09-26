/**
 * W3C Verifiable Credential Signer
 *
 * Implements W3C Verifiable Credentials Data Model 1.1 / 2.0 structure
 * and creates cryptographic signatures using browser Web Crypto API (ECDSA P-256 / SHA-256).
 */

export interface IssueVcParams {
  credentialType: string;
  issuerDid: string;
  issuerName: string;
  recipientDid: string;
  claims: Record<string, unknown>;
  issuedAt?: number;
  expirationDate?: number;
  privateKey: CryptoKey;
}

export interface W3CVerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: {
    id: string;
    name: string;
  };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: unknown;
  };
  proof: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    jws: string;
  };
}

/**
 * Converts a Uint8Array to a URL-safe Base64 string (RFC 7515 / JWS)
 */
function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Cryptographically signs a W3C-compliant Verifiable Credential using the issuer's real Web Crypto private key.
 */
export async function createAndSignVerifiableCredential(
  params: IssueVcParams
): Promise<{
  signedVc: W3CVerifiableCredential;
  rawVcJson: string;
  credentialId: string;
}> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not available.");
  }

  const issuanceTimestamp = params.issuedAt || Date.now();
  const issuanceDate = new Date(issuanceTimestamp).toISOString();
  const expirationDate = params.expirationDate
    ? new Date(params.expirationDate).toISOString()
    : undefined;

  const credentialId = `urn:uuid:${crypto.randomUUID()}`;

  // 1. Build canonical W3C VC document payload without proof
  const types = ["VerifiableCredential"];
  if (params.credentialType && params.credentialType !== "VerifiableCredential") {
    types.push(params.credentialType);
  }

  const payload: Omit<W3CVerifiableCredential, "proof"> = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
      "https://schema.org",
    ],
    id: credentialId,
    type: types,
    issuer: {
      id: params.issuerDid,
      name: params.issuerName,
    },
    issuanceDate,
    ...(expirationDate ? { expirationDate } : {}),
    credentialSubject: {
      id: params.recipientDid,
      ...params.claims,
    },
  };

  // 2. Canonical serialization (deterministic JSON string)
  const canonicalString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const dataToSign = encoder.encode(canonicalString);

  // 3. Cryptographic signing with issuer's ECDSA P-256 private key
  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    params.privateKey,
    dataToSign
  );

  const jwsSignature = bufferToBase64Url(signatureBuffer);
  const proofCreated = new Date().toISOString();

  // 4. Construct complete signed W3C Verifiable Credential
  const signedVc: W3CVerifiableCredential = {
    ...payload,
    proof: {
      type: "JsonWebSignature2020",
      created: proofCreated,
      proofPurpose: "assertionMethod",
      verificationMethod: `${params.issuerDid}#key-1`,
      jws: jwsSignature,
    },
  };

  const rawVcJson = JSON.stringify(signedVc, null, 2);

  return {
    signedVc,
    rawVcJson,
    credentialId,
  };
}
