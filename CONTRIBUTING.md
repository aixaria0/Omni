# Contributing to Omni

Omni combines public-source infrastructure analysis, deterministic proof-carrying workflows, and quantum/classical verification. Changes are welcome when they preserve those boundaries and remain testable.

## Before you change code

Read the relevant documentation first:

- [Architecture](docs/ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Evidence model](docs/EVIDENCE_MODEL.md)
- [Stress Engine](docs/STRESS_ENGINE.md)
- [Autopilot](docs/AUTOPILOT.md)
- [Quantum Fabric](docs/QUANTUM_FABRIC.md)
- [Security model](SECURITY.md)

## Development setup

```bash
npm ci
npm run dev
```

Before opening a pull request, run:

```bash
npm run validate
```

For changes to inherited platform scripts, also run:

```bash
npm run test:platform
```

The platform suite is currently informational in CI because some inherited tests encode generic template metadata assumptions. Product tests remain hard gates.

## Pull request expectations

A strong pull request should:

1. explain the behavior change and why it belongs in Omni;
2. identify any changed trust/security boundary;
3. include tests for deterministic or cryptographic behavior;
4. update documentation when schemas, commands, limits, or user-visible semantics change;
5. avoid unrelated generated/build output;
6. keep secrets, access tokens, cloud credentials, and private data out of the diff.

## Design rules

### Evidence and provenance

- Preserve `sourceIds` when adding or transforming facts.
- Keep semantic evidence identity deterministic.
- Do not introduce random ids into content that participates in Evidence Capsule semantic digests.
- Treat hashes as integrity/identity mechanisms, not proof that a public-source assertion is true.

### Stress Engine

- Keep the counterfactual model deterministic.
- Document changes to support/contradiction factors or search bounds.
- Add invariant tests when changing Shapley attribution, flip search, or robustness-frontier behavior.
- Do not present the stability score as a calibrated truth probability.

### Autopilot

- The same recorded state must replay to the same planner decision.
- Autonomous pivots must remain public-infrastructure scoped unless the project intentionally revises that boundary.
- A receipt-format or hash-material change requires versioning/review; do not silently change portable proof semantics.
- Preserve stop conditions and bounded execution behavior.

### Quantum Fabric

- Label browser results as simulation results.
- Keep pairwise correlation distinct from multipartite entanglement claims.
- Treat ephemeral validator keys as certificate-local identities, not an externally governed BFT network.
- Add regression tests for changes to witness math, SHA3 input material, quorum logic, or typed bound subjects.

### Amazon Braket

- Never commit AWS keys or account secrets.
- Keep device selection explicit and runtime-configurable.
- Do not imply a local/browser simulation ran on physical hardware.

## Code style

The repository uses TypeScript, ESLint, and Prettier.

```bash
npm run typecheck
npm run lint
npm run format
```

Prefer small, explicit functions and deterministic data transformations in verification code. Avoid hiding security-relevant transformations behind opaque helpers that are difficult to replay or test.

## Tests

Tests should focus on externally meaningful invariants rather than implementation trivia.

Examples of good invariants:

- equivalent evidence produces the same semantic digest;
- tampering changes or invalidates a proof root;
- a planner decision can be replayed from recorded state;
- robustness frontier does not improve as the removal budget increases;
- a malformed bound digest is rejected;
- a 3-of-4 quorum tolerates the single modeled Byzantine vote.

## Documentation style

Use precise terms:

- say **integrity** when you mean digest/signature consistency;
- say **robustness** when you mean sensitivity under the Stress model;
- say **attestation** when a digest is bound into a certificate;
- say **simulation** for browser quantum execution;
- reserve **truth**, **provenance authority**, and **physical execution** for cases where the implementation actually establishes them.

## Commit and PR scope

Keep a change coherent. A documentation-only cleanup should not silently change cryptographic semantics. A proof-format change should not be mixed with unrelated styling work unless both are required by the same user-visible feature.

## Contribution licensing

Omni is proprietary, not open source. By submitting a contribution, you agree to the contribution terms in [LICENSE](LICENSE), including the grant necessary for the copyright holder to use, modify, sublicense, relicense, and distribute the contribution as part of Omni. Do not submit code or other material you do not have the right to contribute under those terms.

## Security-sensitive changes

For vulnerabilities or security boundary issues, do not open a public issue with exploit details. Follow [SECURITY.md](SECURITY.md).
