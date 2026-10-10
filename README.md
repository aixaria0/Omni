# Omni

Omni is a multi-surface research workspace. The repository currently contains two product planes that share one TanStack/React shell:

- **OmniTrace** — public-source infrastructure intelligence, hypothesis analysis, reproducible Evidence Capsules and drift detection.
- **Omni Quantum Fabric** — a quantum/classical verification lab and shared attestation ledger.

## Evidence Capsules + Drift Radar

Every live OmniTrace investigation can be sealed into a portable `omnitrace.evidence-capsule` JSON artifact. A capsule contains normalized source manifests, facts, graph topology, timeline, hypothesis lattice and disagreement state without persisting the raw collector bodies themselves.

The integrity model deliberately separates two identities:

- **`evidenceDigest`** — stable across re-runs when the semantic evidence has not changed.
- **`rootDigest`** — binds the evidence digest to observation metadata and the concrete investigation identity.

Each section has its own SHA3-512 digest. Imported capsules are verified before they are admitted to the local archive. Re-running the same indicator compares the current live draft to the previous sealed observation and reports semantic source/fact/graph/lattice drift rather than a noisy whole-document JSON diff.

A sealed capsule can also be sent directly to **Bound Quantum Attestation**. QuantumCert includes that exact capsule root in its signed proposal and hybrid binding, then persists the resulting certificate into the shared Quantum Fabric certificate ledger. This attests snapshot integrity and identity; it does **not** claim the underlying OSINT assertion is true.

## Evidence Stress Engine

OmniTrace includes a deterministic robustness lab for the active Hypothesis Lattice. It answers a different question from ordinary scoring: **what would have to fail or disappear for the conclusion to change?**

- leave-one-evidence-out posterior sensitivity
- exact minimal flip-set search up to a bounded removal depth
- source-family knockout to expose correlated evidence dependence
- Shapley-style coalitional contribution to the leader margin (exact for small matrices, deterministic sampling for larger ones)
- adversarial robustness frontier for removal budgets 0–4
- entropy-aware next-best collection priorities focused on the closest competing hypotheses

The stress score is a decision-robustness metric, not a truth score. For model-produced Grok lattices, counterfactual percentages are explicitly labeled sensitivity approximations rather than model re-runs.

## Quantum Fabric

Open `/quantum` in the app. It is intentionally split into three trust boundaries.

### 1. 12-Qubit Register

A browser-local 12-qubit statevector engine with 4096 complex amplitudes. It supports:

- GHZ and all-zero initialization
- H, X, RY, and CNOT gates
- Born-rule measurement with state collapse
- Z and ZZ expectation values
- global `X⊗12` coherence
- natural-language/command input

The UI explicitly distinguishes **pairwise correlation** from **multipartite GHZ entanglement**. A simulator is never presented as physical quantum hardware.

### 2. QuantumCert

A hybrid certificate engine that binds three independent checks:

1. **Quantum evidence** — Bell witness / GHZ coherence / shadow estimate
2. **Classical quorum** — 4 validators, `f=1`, threshold `3/4`, fresh Ed25519 signatures
3. **Binding integrity** — SHA3-512 binds the quantum digest and verified quorum certificate

Built-in scenarios:

- Bell state → accepted
- separable state → rejected
- post-bind tampering → rejected
- one Byzantine validator → accepted with `3/4` verified quorum
- shadow estimate → uncertainty-aware evaluation
- GHZ₁₂ → multipartite coherence path

Certificate cards expose the proposal digest, quantum digest, binding digest, validator signatures, check results, anomaly flags, and—when present—the bound Evidence Capsule subject.

### 3. Amazon Braket Bridge

`braket/` contains an independent Python 3.12 Hybrid Jobs runner. The same variational algorithm can switch between:

- embedded local simulator
- Amazon SV1
- Amazon DM1
- a QPU ARN supplied at runtime

The bridge includes `@hybrid_job`, `requirements.txt`, optional S3 output, EC2 instance configuration, runtime stopping limits, parameter-shift optimization, Hybrid Jobs metrics, CloudWatch log collection for managed jobs, dry-run configuration checks, and a non-secret environment template.

See [`braket/README.md`](braket/README.md) for setup and commands.

## Development

```bash
npm install
npm run dev
```

Validation hard gates:

```bash
node --experimental-strip-types --test \
  src/lib/app-data/app-data.test.ts \
  src/lib/app-data/readiness-schedule.test.ts \
  src/lib/auth/gate-identity.test.ts \
  src/lib/auth/sign-in-gate.test.ts \
  src/lib/quantum/*.test.ts \
  src/lib/osint/capsule.test.ts
npm run typecheck
npm run build:dev
```

CI installs from the synchronized lockfile with `npm ci`. The existing platform-script test baseline remains informational because those template-level tests include pre-existing metadata expectations that do not match the baked OmniTrace identity.

## Security / evidence boundaries

- No AWS credentials or QPU secrets are stored in the repository.
- Browser statevector results are labeled simulation results.
- Physical-device evidence must come from the Braket bridge and its managed job identity/logs.
- Cryptographic certificate signatures use WebCrypto Ed25519; certificate and Evidence Capsule binding use a tested SHA3-512 implementation.
- Imported Evidence Capsules are integrity-verified and capped at 2 MB before local persistence.
- The retired Amazon Braket TN1 simulator is intentionally not included in the backend registry.
