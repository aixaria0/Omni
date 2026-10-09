const MASK_64 = (1n << 64n) - 1n;
const RATE_BYTES = 72;

const ROTATION = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
];

const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n,
  0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n,
  0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn,
  0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n,
  0x0000000080000001n, 0x8000000080008008n,
];

function rotateLeft(value: bigint, shift: number) {
  if (shift === 0) return value & MASK_64;
  const s = BigInt(shift);
  return ((value << s) | (value >> (64n - s))) & MASK_64;
}

function keccakF(state: bigint[]) {
  for (const rc of ROUND_CONSTANTS) {
    const c = new Array<bigint>(5).fill(0n);
    const d = new Array<bigint>(5).fill(0n);
    for (let x = 0; x < 5; x += 1) {
      c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    }
    for (let x = 0; x < 5; x += 1) {
      d[x] = c[(x + 4) % 5] ^ rotateLeft(c[(x + 1) % 5], 1);
    }
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) state[x + 5 * y] = (state[x + 5 * y] ^ d[x]) & MASK_64;
    }

    const b = new Array<bigint>(25).fill(0n);
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const destinationX = y;
        const destinationY = (2 * x + 3 * y) % 5;
        b[destinationX + 5 * destinationY] = rotateLeft(state[x + 5 * y], ROTATION[x + 5 * y]);
      }
    }

    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        state[x + 5 * y] = (
          b[x + 5 * y] ^ ((~b[((x + 1) % 5) + 5 * y]) & b[((x + 2) % 5) + 5 * y])
        ) & MASK_64;
      }
    }
    state[0] = (state[0] ^ rc) & MASK_64;
  }
}

function toBytes(input: string | Uint8Array) {
  return typeof input === "string" ? new TextEncoder().encode(input) : input;
}

function absorbBlock(state: bigint[], block: Uint8Array) {
  for (let lane = 0; lane < RATE_BYTES / 8; lane += 1) {
    let value = 0n;
    for (let byte = 0; byte < 8; byte += 1) {
      value |= BigInt(block[lane * 8 + byte] ?? 0) << BigInt(byte * 8);
    }
    state[lane] ^= value;
  }
  keccakF(state);
}

export function sha3_512(input: string | Uint8Array) {
  const bytes = toBytes(input);
  const state = new Array<bigint>(25).fill(0n);
  let offset = 0;
  while (offset + RATE_BYTES <= bytes.length) {
    absorbBlock(state, bytes.slice(offset, offset + RATE_BYTES));
    offset += RATE_BYTES;
  }

  const finalBlock = new Uint8Array(RATE_BYTES);
  finalBlock.set(bytes.slice(offset));
  finalBlock[bytes.length - offset] ^= 0x06;
  finalBlock[RATE_BYTES - 1] ^= 0x80;
  absorbBlock(state, finalBlock);

  const out = new Uint8Array(64);
  for (let i = 0; i < out.length; i += 1) {
    const lane = Math.floor(i / 8);
    out[i] = Number((state[lane] >> BigInt((i % 8) * 8)) & 0xffn);
  }
  return out;
}

export function sha3_512Hex(input: string | Uint8Array) {
  return [...sha3_512(input)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
