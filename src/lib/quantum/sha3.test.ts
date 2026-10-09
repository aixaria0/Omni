import assert from "node:assert/strict";
import test from "node:test";
import { sha3_512Hex } from "./sha3.ts";

test("SHA3-512 matches the FIPS 202 empty-string vector", () => {
  assert.equal(
    sha3_512Hex(""),
    "a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26",
  );
});

test("SHA3-512 is deterministic and input-sensitive", () => {
  assert.equal(sha3_512Hex("omni"), sha3_512Hex("omni"));
  assert.notEqual(sha3_512Hex("omni"), sha3_512Hex("Omni"));
});
