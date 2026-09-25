/**
 * IndexedDB Secure Key Store
 *
 * Stores Web Crypto CryptoKey objects directly in the browser's IndexedDB.
 * The private key is never exported as plain text or transmitted over the network.
 */

const DB_NAME = "verifi_identity_vault";
const DB_VERSION = 1;
const STORE_NAME = "private_keys";

export interface StoredKeyRecord {
  userId: string; // Clerk User ID
  did: string;
  keyType: "ECDSA-P256" | "Ed25519";
  publicKeyHex: string;
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  createdAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this browser environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "userId" });
        store.createIndex("by_did", "did", { unique: true });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open identity key store database."));
    };
  });
}

/**
 * Persists a generated keypair record securely in IndexedDB
 */
export async function storeKeyRecord(record: StoredKeyRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error("Failed to store private key in enclave."));
  });
}

/**
 * Retrieves the stored keypair record by Clerk User ID
 */
export async function getKeyRecordByUserId(userId: string): Promise<StoredKeyRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(userId);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error("Failed to read private key record."));
  });
}

/**
 * Retrieves the stored keypair record by DID
 */
export async function getKeyRecordByDid(did: string): Promise<StoredKeyRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by_did");
    const req = index.get(did);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error("Failed to find private key by DID."));
  });
}

/**
 * Checks whether a local private key exists for the given user
 */
export async function hasLocalKey(userId: string): Promise<boolean> {
  try {
    const record = await getKeyRecordByUserId(userId);
    return record !== null && record.privateKey !== undefined;
  } catch {
    return false;
  }
}
