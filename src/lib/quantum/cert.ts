import { QuantumRegister } from "./register.ts";
import { sha3_512Hex } from "./sha3.ts";

export type QuantumScenario = "bell" | "separable" | "tamper" | "byzantine" | "shadow" | "ghz";

export type CertificateStatus = "ACCEPTED" | "REJECTED" | "INCONCLUSIVE";

export type WitnessRecord = {
  method: "bell-pauli" | "classical-shadow" | "ghz-coherence";
  value: number;
  uncertainty: number;
  observables: Record<string, number>;
  passed: boolean;
  explanation: string;
};

export type QuorumVote = {
  nodeId: string;
  publicKey: string;
  signature: string;
  verified: boolean;
};

export type CertificateSubject = {
  kind: "evidence-capsule";
  label: string;
  digest: string;
};

export type HybridCertificate = {
  id: string;
  scenario: QuantumScenario;
  subject?: CertificateSubject;
  status: CertificateStatus;
  createdAt: string;
  proposalDigest: string;
  quantumDigest: string;
  quorum: {
    threshold: number;
    validVotes: number;
    totalNodes: number;
    votes: QuorumVote[];
  };
  witness: WitnessRecord;
  binding: {
    algorithm: "SHA3-512";
    digest: string;
    expectedDigest: string;
    verified: boolean;
  };
  checks: {
    quantumEvidence: boolean;
    classicalQuorum: boolean;
    bindingIntegrity: boolean;
  };
  anomalies: string[];
};

const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...view].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(object[key])}`)
    .join(",")}}`;
}

function round(value: number, digits = 8) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function bellWitness(register: QuantumRegister): WitnessRecord {
  const xx = register.expectationXX(0, 1);
  const yy = register.expectationYY(0, 1);
  const zz = register.expectationZZ(0, 1);
  const value = (1 - xx + yy - zz) / 4;
  return {
    method: "bell-pauli",
    value: round(value),
    uncertainty: 0,
    observables: { XX: round(xx), YY: round(yy), ZZ: round(zz) },
    passed: value < -1e-9,
    explanation:
      value < -1e-9
        ? "Negative Bell witness certifies entanglement for the tested two-qubit state."
        : "Bell witness is non-negative; this test does not certify entanglement.",
  };
}

function shadowWitness(register: QuantumRegister): WitnessRecord {
  const exact = bellWitness(register);
  const snapshots = 300;
  const groups = 10;
  const groupSize = snapshots / groups;
  const visibility = 0.92;
  const axes = ["XX", "YY", "ZZ"] as const;
  const expectations = axes.map((axis) => exact.observables[axis] * visibility);
  let state = 0xc0ffee;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const estimates: number[][] = [];
  const groupWitnesses: number[] = [];

  for (let group = 0; group < groups; group += 1) {
    const sums = [0, 0, 0];
    for (let shot = 0; shot < groupSize; shot += 1) {
      const setting = Math.min(2, Math.floor(random() * 3));
      const expectation = expectations[setting];
      const outcome = random() < (1 + expectation) / 2 ? 1 : -1;
      sums[setting] += 3 * outcome;
    }
    const groupEstimate = sums.map((sum) => sum / groupSize);
    estimates.push(groupEstimate);
    groupWitnesses.push((1 - groupEstimate[0] + groupEstimate[1] - groupEstimate[2]) / 4);
  }

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const xx = median(estimates.map((row) => row[0]));
  const yy = median(estimates.map((row) => row[1]));
  const zz = median(estimates.map((row) => row[2]));
  const value = (1 - xx + yy - zz) / 4;
  const mean = groupWitnesses.reduce((sum, item) => sum + item, 0) / groups;
  const variance = groupWitnesses.reduce((sum, item) => sum + (item - mean) ** 2, 0) / (groups - 1);
  const uncertainty = Math.sqrt(variance / groups);

  return {
    method: "classical-shadow",
    value: round(value),
    uncertainty: round(uncertainty),
    observables: { XX: round(xx), YY: round(yy), ZZ: round(zz), snapshots, visibility },
    passed: value + 2 * uncertainty < 0,
    explanation:
      value + 2 * uncertainty < 0
        ? "Randomized Pauli-shadow median-of-means estimate remains negative beyond a two-sigma margin."
        : "Shadow estimate overlaps zero; evidence is inconclusive at the selected margin.",
  };
}

function ghzWitness(): WitnessRecord {
  const register = new QuantumRegister(12, "ghz");
  const globalX = register.expectationGlobalX();
  const zz01 = register.expectationZZ(0, 1);
  const value = -globalX;
  return {
    method: "ghz-coherence",
    value: round(value),
    uncertainty: 0,
    observables: { "X^12": round(globalX), Z0Z1: round(zz01) },
    passed: globalX > 0.999,
    explanation:
      "Global X coherence is evaluated as a multipartite GHZ signature; pairwise Z correlation is not labeled pairwise entanglement.",
  };
}

function buildWitness(scenario: QuantumScenario) {
  if (scenario === "ghz") return ghzWitness();
  const register = new QuantumRegister(2, "zero");
  if (scenario === "separable") {
    register.applyH(1);
    return bellWitness(register);
  }
  register.applyH(0);
  register.applyCnot(0, 1);
  return scenario === "shadow" ? shadowWitness(register) : bellWitness(register);
}

async function createVote(
  nodeId: string,
  message: string,
  verifyMessage = message,
): Promise<QuorumVote> {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto is unavailable");
  const keys = (await globalThis.crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const signature = await globalThis.crypto.subtle.sign(
    "Ed25519",
    keys.privateKey,
    encoder.encode(message),
  );
  const verified = await globalThis.crypto.subtle.verify(
    "Ed25519",
    keys.publicKey,
    signature,
    encoder.encode(verifyMessage),
  );
  const publicKey = await globalThis.crypto.subtle.exportKey("raw", keys.publicKey);
  return {
    nodeId,
    publicKey: hex(publicKey),
    signature: hex(signature),
    verified,
  };
}

function classifyStatus(
  witness: WitnessRecord,
  quorumPassed: boolean,
  bindingPassed: boolean,
): CertificateStatus {
  if (!quorumPassed || !bindingPassed) return "REJECTED";
  if (!witness.passed) {
    if (witness.method === "classical-shadow" && witness.value - 2 * witness.uncertainty < 0) {
      return "INCONCLUSIVE";
    }
    return "REJECTED";
  }
  return "ACCEPTED";
}

async function buildCertificate(
  scenario: QuantumScenario,
  subject?: CertificateSubject,
): Promise<HybridCertificate> {
  const witness = buildWitness(scenario);
  const quantumDigest = sha3_512Hex(
    stable({
      method: witness.method,
      value: witness.value,
      uncertainty: witness.uncertainty,
      observables: witness.observables,
    }),
  );
  const proposalDigest = sha3_512Hex(
    stable({ scenario, quantumDigest, ...(subject ? { subject } : {}) }),
  );
  const threshold = 3;
  const votes = await Promise.all(
    [0, 1, 2, 3].map((index) => {
      const byzantine = scenario === "byzantine" && index === 3;
      const signedMessage = byzantine ? `${proposalDigest}:equivocation` : proposalDigest;
      return createVote(`validator-${index + 1}`, signedMessage, proposalDigest);
    }),
  );
  const validVotes = votes.filter((vote) => vote.verified).length;
  const quorumPassed = validVotes >= threshold;
  const quorumDigest = sha3_512Hex(
    stable({
      proposalDigest,
      signatures: votes
        .filter((vote) => vote.verified)
        .map((vote) => vote.signature)
        .sort(),
    }),
  );
  const bindingMaterial = subject
    ? `${quorumDigest}:${quantumDigest}:${subject.digest}`
    : `${quorumDigest}:${quantumDigest}`;
  const expectedDigest = sha3_512Hex(bindingMaterial);
  const digest =
    scenario === "tamper"
      ? `${expectedDigest.slice(0, -1)}${expectedDigest.endsWith("0") ? "1" : "0"}`
      : expectedDigest;
  const bindingPassed = digest === expectedDigest;
  const status = classifyStatus(witness, quorumPassed, bindingPassed);
  const anomalies: string[] = [];

  if (scenario === "byzantine") {
    anomalies.push(
      "One validator equivocated; quorum remained valid with 3/4 verified Ed25519 votes.",
    );
  }
  if (quorumPassed && !witness.passed) {
    anomalies.push("Classical quorum succeeded while quantum evidence failed policy.");
  }
  if (!bindingPassed) {
    anomalies.push(
      "Binding digest mismatch: certificate contents changed after evidence/quorum binding.",
    );
  }

  const createdAt = new Date().toISOString();
  const id = sha3_512Hex(stable({ createdAt, proposalDigest, digest, subject })).slice(0, 32);
  return {
    id,
    scenario,
    ...(subject ? { subject } : {}),
    status,
    createdAt,
    proposalDigest,
    quantumDigest,
    quorum: { threshold, validVotes, totalNodes: votes.length, votes },
    witness,
    binding: {
      algorithm: "SHA3-512",
      digest,
      expectedDigest,
      verified: bindingPassed,
    },
    checks: {
      quantumEvidence: witness.passed,
      classicalQuorum: quorumPassed,
      bindingIntegrity: bindingPassed,
    },
    anomalies,
  };
}

export async function runCertificateScenario(
  scenario: QuantumScenario,
): Promise<HybridCertificate> {
  return buildCertificate(scenario);
}

export async function runBoundCertificate(
  capsuleRootDigest: string,
  label: string,
): Promise<HybridCertificate> {
  const normalized = capsuleRootDigest.trim().toLowerCase();
  if (!/^[0-9a-f]{128}$/.test(normalized)) {
    throw new Error("Evidence Capsule root digest must be a 512-bit hexadecimal SHA3 digest");
  }
  return buildCertificate("bell", {
    kind: "evidence-capsule",
    label: label.trim() || "OmniTrace Evidence Capsule",
    digest: normalized,
  });
}
