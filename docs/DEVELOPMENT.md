# Development

This document describes the repository-level development workflow for Omni.

## Requirements

- Node.js **22 or newer**
- npm
- Python 3.12 only if you are working on the Amazon Braket bridge
- Docker only if you use Amazon Braket local Hybrid Jobs mode

## Install

Use the synchronized lockfile:

```bash
npm ci
```

For normal dependency changes, update both `package.json` and `package-lock.json` and verify that `npm ci` still succeeds in a clean environment.

## Run the web application

```bash
npm run dev
```

The development script intentionally routes Vite through `scripts/with-app-env.mjs`. Use the npm script rather than invoking Vite directly so the repository's application-environment contract remains consistent.

## Core scripts

| Command                              | Purpose                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| `npm run dev`                        | Start the development server through the environment wrapper.     |
| `npm run build:dev`                  | Build the Vite/TanStack/Nitro application in development mode.    |
| `npm run build`                      | Production-style build followed by the repository migration step. |
| `npm run typecheck`                  | Run TypeScript with `--noEmit`.                                   |
| `npm run lint`                       | Run ESLint across the repository.                                 |
| `npm test`                           | Alias for the hard-gate core/OSINT/quantum test suite.            |
| `npm run test:core`                  | Run app-data, auth, OSINT, and quantum tests.                     |
| `npm run test:platform`              | Run inherited platform/template tests separately.                 |
| `npm run validate`                   | Core tests + typecheck + lint + development build.                |
| `npm run verify:autopilot -- <file>` | Verify an exported Autopilot proof receipt.                       |

## Test model

### Hard-gate tests

`npm run test:core` is the repository's product correctness gate. It covers:

- app-data helpers;
- auth/gate identity logic;
- Evidence Capsules;
- semantic drift;
- content-addressed fusion identity;
- Evidence Stress Engine;
- proof-carrying Autopilot receipts and replay verification;
- SHA3-512;
- statevector behavior;
- QuantumCert scenarios and bound subjects.

### Platform/template tests

`npm run test:platform` exercises inherited application-builder/platform scripts. Some of those tests encode generic template metadata expectations while Omni intentionally bakes its own `OmniTrace` application identity into the PWA metadata path.

For that reason CI currently runs this suite as an **informational baseline** (`continue-on-error`) while product tests, typecheck, and build remain hard gates.

Do not hide a new product regression by moving it into the informational suite. Product behavior belongs in `src/**/*.test.ts` and should remain a hard gate.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main` / `feat/**` branches.

The validation job uses Node 22 and performs:

```text
npm ci
npm run test:core
npm run test:platform       # informational baseline
npm run typecheck
npm run build:dev
```

A pull request should not be considered ready when a hard-gate step fails.

## OSINT development conventions

### Preserve provenance

When adding a fused fact, keep the originating `sourceIds` accurate. Stress source-knockout logic and later audit surfaces depend on this relationship.

### Preserve semantic identity

Do not introduce random ids into Evidence Capsule semantic content. Fact and GraphEdge ids are content-addressed specifically so equivalent observations can produce stable semantic evidence digests.

### Keep Autopilot deterministic

Autopilot planner output is replayed during proof verification. Planner changes must be deterministic for the same recorded state and should include tests that verify the resulting receipt.

### Keep autonomous pivots infrastructure-only

Do not expand the eligible autonomous target classes beyond IP/domain/ASN without a deliberate security/design review. Person-targeting or deanonymization behavior is outside the intended boundary.

## Quantum development conventions

### Do not conflate simulation with hardware

The browser register is a statevector simulator. Any UI or documentation change must preserve that distinction.

### Keep certificate binding reproducible

Changes to certificate proposal material, quorum digesting, witness serialization, or typed subjects can invalidate existing assumptions about certificate identity. Add/update tests when these structures change.

### Keep SHA3 regression coverage

The repository tests the SHA3-512 implementation against a known FIPS 202 vector. Do not replace or weaken this test when changing hashing code.

## Braket development

The Python bridge lives under `braket/` and has its own environment:

```bash
cd braket
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python run_job.py --dry-run
```

See [braket/README.md](../braket/README.md) for backend selection and managed-run configuration.

## Generated files

Avoid committing incidental build output created only by local validation. In particular, a Vite/Nitro build may touch generated route or deployment output depending on the environment. Review `git status` after a build and keep unrelated generated noise out of feature commits.

## Documentation changes

Documentation should use the repository's actual vocabulary and implementation limits. When documenting a numeric bound or cryptographic field, verify it against source/tests rather than copying an older README statement.

Useful source-of-truth files include:

```text
src/lib/osint/capsule.ts
src/lib/osint/stress.ts
src/lib/osint/autopilot.ts
src/lib/quantum/register.ts
src/lib/quantum/cert.ts
.github/workflows/ci.yml
```
