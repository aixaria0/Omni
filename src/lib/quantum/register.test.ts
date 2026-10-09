import assert from "node:assert/strict";
import test from "node:test";
import { executeQuantumCommand } from "./commands.ts";
import { QuantumRegister } from "./register.ts";

test("GHZ12 initializes as a normalized two-amplitude multipartite state", () => {
  const register = new QuantumRegister(12, "ghz");
  const summary = register.summary();

  assert.ok(Math.abs(summary.norm - 1) < 1e-12);
  assert.equal(summary.nonZero, 2);
  assert.equal(summary.dimension, 4096);
  assert.equal(summary.totalPairs, 66);
  assert.equal(summary.perfectZPairs, 66);
  assert.ok(Math.abs(summary.globalX - 1) < 1e-12);
  assert.ok(Math.abs(register.expectationZ(0)) < 1e-12);
  assert.ok(Math.abs(register.expectationZZ(0, 11) - 1) < 1e-12);
});

test("Bell witness observables have the correct Pauli signs", () => {
  const register = new QuantumRegister(2, "zero");
  register.applyH(0);
  register.applyCnot(0, 1);

  assert.ok(Math.abs(register.expectationXX(0, 1) - 1) < 1e-12);
  assert.ok(Math.abs(register.expectationYY(0, 1) + 1) < 1e-12);
  assert.ok(Math.abs(register.expectationZZ(0, 1) - 1) < 1e-12);
});

test("Hadamard on GHZ12 expands support from two to four amplitudes", () => {
  const register = new QuantumRegister(12, "ghz");
  register.applyH(0);
  assert.equal(register.nonZeroCount(), 4);
  assert.ok(Math.abs(register.norm() - 1) < 1e-12);
});

test("measurement obeys the supplied random draw and collapses the state", () => {
  const register = new QuantumRegister(12, "ghz");
  const outcome = register.measureAll(() => 0.9);

  assert.equal(outcome.bitstring, "111111111111");
  assert.ok(Math.abs(outcome.probability - 0.5) < 1e-12);
  assert.equal(register.nonZeroCount(), 1);
  assert.ok(Math.abs(register.expectationZ(0) + 1) < 1e-12);
});

test("natural-language command layer mutates and queries the same register", () => {
  const register = new QuantumRegister(12, "ghz");
  const gate = executeQuantumCommand(register, "Apply Hadamard to qubit 3");
  assert.equal(gate.destructive, true);
  assert.equal(register.nonZeroCount(), 4);

  const reset = executeQuantumCommand(register, "reset to GHZ");
  assert.equal(reset.destructive, true);
  assert.equal(register.nonZeroCount(), 2);

  const query = executeQuantumCommand(register, "ZZ 0 5");
  assert.match(query.message, /1\.000000/);
});
