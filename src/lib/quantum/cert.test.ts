import assert from "node:assert/strict";
import test from "node:test";
import { bellWitness, runCertificateScenario } from "./cert.ts";
import { QuantumRegister } from "./register.ts";

test("Bell state is accepted with a -0.5 witness and full quorum", async () => {
  const certificate = await runCertificateScenario("bell");
  assert.equal(certificate.status, "ACCEPTED");
  assert.equal(certificate.witness.value, -0.5);
  assert.equal(certificate.quorum.validVotes, 4);
  assert.equal(certificate.binding.verified, true);
});

test("separable state produces +0.25 witness and is rejected", async () => {
  const certificate = await runCertificateScenario("separable");
  assert.equal(certificate.status, "REJECTED");
  assert.equal(certificate.witness.value, 0.25);
  assert.equal(certificate.checks.quantumEvidence, false);
});

test("tampering after hybrid binding is detected", async () => {
  const certificate = await runCertificateScenario("tamper");
  assert.equal(certificate.status, "REJECTED");
  assert.equal(certificate.binding.verified, false);
  assert.ok(certificate.anomalies.some((value) => value.includes("Binding digest mismatch")));
});

test("one Byzantine validator cannot prevent a 3-of-4 quorum", async () => {
  const certificate = await runCertificateScenario("byzantine");
  assert.equal(certificate.status, "ACCEPTED");
  assert.equal(certificate.quorum.validVotes, 3);
  assert.equal(certificate.quorum.votes.filter((vote) => !vote.verified).length, 1);
});

test("randomized Pauli shadow path uses 300 snapshots and median-of-means", async () => {
  const certificate = await runCertificateScenario("shadow");
  assert.equal(certificate.status, "ACCEPTED");
  assert.equal(certificate.witness.method, "classical-shadow");
  assert.equal(certificate.witness.observables.snapshots, 300);
  assert.equal(certificate.witness.value, -0.4375);
  assert.ok(certificate.witness.uncertainty > 0);
});

test("GHZ scenario uses multipartite coherence rather than pairwise Bell claims", async () => {
  const certificate = await runCertificateScenario("ghz");
  assert.equal(certificate.status, "ACCEPTED");
  assert.equal(certificate.witness.method, "ghz-coherence");
  assert.equal(certificate.witness.observables["X^12"], 1);
});

test("Bell witness helper is independently reproducible", () => {
  const register = new QuantumRegister(2, "zero");
  register.applyH(0);
  register.applyCnot(0, 1);
  const witness = bellWitness(register);
  assert.equal(witness.value, -0.5);
  assert.deepEqual(witness.observables, { XX: 1, YY: -1, ZZ: 1 });
});
