# Omni

Omni is a multi-surface research workspace. The repository currently contains two product planes that share one TanStack/React shell:

- **OmniTrace** — public-source infrastructure intelligence and hypothesis analysis.
- **Omni Quantum Fabric** — a quantum/classical verification lab derived from the project research notes.

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

Certificate cards expose the proposal digest, quantum digest, binding digest, validator signatures, check results, and anomaly flags.

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

Validation:

```bash
npm test
npm run typecheck
npm run build
```

The quantum core tests can also run directly on modern Node without the UI dependency graph:

```bash
node --experimental-strip-types --test src/lib/quantum/*.test.ts
```

## Security / evidence boundaries

- No AWS credentials or QPU secrets are stored in the repository.
- Browser statevector results are labeled simulation results.
- Physical-device evidence must come from the Braket bridge and its managed job identity/logs.
- Cryptographic certificate signatures use WebCrypto Ed25519; certificate binding uses a tested SHA3-512 implementation.
- The retired Amazon Braket TN1 simulator is intentionally not included in the backend registry.
