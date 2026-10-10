# Omni documentation

This directory is the technical reference for Omni. The root [README](../README.md) is intentionally concise; subsystem behavior, invariants, and trust limits live here.

## Reading paths

### I want to understand the system

1. [Architecture](ARCHITECTURE.md)
2. [Collectors](COLLECTORS.md)
3. [Evidence model](EVIDENCE_MODEL.md)
4. [Stress Engine](STRESS_ENGINE.md)
5. [Autopilot](AUTOPILOT.md)
6. [Quantum Fabric](QUANTUM_FABRIC.md)

### I want to run or change the repository

1. [Development](DEVELOPMENT.md)
2. [Contributing](../CONTRIBUTING.md)
3. [Security model](../SECURITY.md)
4. [Amazon Braket bridge](../braket/README.md)

## Core artifact schemas

| Artifact           | Schema/version                   | Primary implementation       |
| ------------------ | -------------------------------- | ---------------------------- |
| Evidence Capsule   | `omnitrace.evidence-capsule` v1  | `src/lib/osint/capsule.ts`   |
| Stress report      | `omni-stress/v1`                 | `src/lib/osint/stress.ts`    |
| Autopilot receipt  | `omnitrace.autopilot-receipt` v1 | `src/lib/osint/autopilot.ts` |
| Hybrid certificate | TypeScript `HybridCertificate`   | `src/lib/quantum/cert.ts`    |

## Trust vocabulary

Documentation uses these terms deliberately:

- **integrity** — the recorded artifact matches the digests or signatures that bind it;
- **semantic identity** — evidence content is equivalent under Omni's canonicalized representation;
- **observation identity** — a concrete collection event, including metadata tied to that observation;
- **robustness** — a conclusion remains stable under the implemented evidence-removal model;
- **attestation** — a digest is bound to a certificate record and quorum/witness state;
- **truth** — an external-world claim is actually correct. Omni does not equate the previous four properties with truth.

## Source of truth

When documentation and implementation disagree, the implementation and its tests are authoritative. Documentation changes that describe behavior should normally be accompanied by a check against the relevant source/test file.
