/**
 * Base58-BTC Encoder and Decoder
 * Uses the Bitcoin / IPFS / W3C standard Base58 alphabet.
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ALPHABET_MAP: { [char: string]: number } = {};
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_MAP[ALPHABET.charAt(i)] = i;
}

export function encodeBase58(source: Uint8Array): string {
  if (source.length === 0) return "";

  const digits = [0];
  for (let i = 0; i < source.length; i++) {
    for (let j = 0; j < digits.length; j++) {
      digits[j] <<= 8;
    }
    digits[0] += source[i];

    let carry = 0;
    for (let j = 0; j < digits.length; ++j) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }

    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Deal with leading zeros
  let str = "";
  for (let i = 0; i < source.length && source[i] === 0; i++) {
    str += ALPHABET[0];
  }

  for (let i = digits.length - 1; i >= 0; i--) {
    str += ALPHABET[digits[i]];
  }

  return str;
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

  // Deal with leading zeros
  for (let i = 0; i < string.length && string[i] === ALPHABET[0]; i++) {
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
}
