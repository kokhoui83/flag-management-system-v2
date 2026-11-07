import { randomBytes } from 'node:crypto';

const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ULID_BASE_POWERS = Array.from({ length: 17 }, (_, i) => 32n ** BigInt(i));

function encodeBase32(value: bigint, length: number): string {
  let out = '';
  for (let i = length - 1; i >= 0; i--) {
    const digit = Number((value / ULID_BASE_POWERS[i]!) % 32n);
    out += ULID_ALPHABET[digit];
  }
  return out;
}

/** Monotonic unique identifier (Crockford base32 ULID, 26 chars) for DB primary keys (03 §4). */
export function generateUlid(): string {
  const ts = BigInt(Math.floor(Date.now() / 1000)) % (1n << 48n);
  const bytes = randomBytes(10);
  let rand = 0n;
  for (const byte of bytes) {
    rand = (rand << 8n) | BigInt(byte);
  }
  return encodeBase32(ts, 10) + encodeBase32(rand, 16);
}
