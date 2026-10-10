# Evidence model

Omni separates **what was observed**, **what that evidence means semantically**, and **how a concrete observation is identified**. Evidence Capsules are the portable boundary for that model.

## Evidence Capsule schema

Current schema:

```text
schema  = omnitrace.evidence-capsule
version = 1
```

A capsule contains:

```text
subject
coverage
sections.sources
sections.facts
sections.graph
sections.timeline
sections.lattice
sections.disagreements
sectionDigests.*
evidenceDigest
rootDigest
```

Raw collector response bodies are not embedded in the capsule. Source manifests carry a `dataDigest` computed from the response body (or error material) processed at sealing time.

## Dual identity model

Two digests exist on purpose.

### `evidenceDigest`

`evidenceDigest` represents semantic evidence identity. It is derived from:

- subject query;
- subject kind;
- all section digests.

It deliberately excludes observation-specific identifiers such as the investigation id. Equivalent normalized evidence can therefore produce the same semantic digest across separate observations.

### `rootDigest`

`rootDigest` binds the semantic evidence to a concrete observation. It includes:

- schema and version;
- observation timestamp;
- full subject including investigation id;
- coverage summary;
- section digests;
- `evidenceDigest`.

`capsuleId` is the first 32 hexadecimal characters of `rootDigest`.

## Section integrity

Every section has its own SHA3-512 digest:

| Section         | Meaning                                      |
| --------------- | -------------------------------------------- |
| `sources`       | normalized source manifest + payload digests |
| `facts`         | normalized facts and source ids              |
| `graph`         | nodes, edges, topology metadata              |
| `timeline`      | normalized temporal events                   |
| `lattice`       | active hypothesis state and evidence matrix  |
| `disagreements` | explicit conflicts identified during fusion  |

`verifyEvidenceCapsule` recomputes every section digest, the semantic digest, and the root digest. A capsule is valid only when all layers agree.

## Canonicalization

Digest input uses deterministic key ordering. Arrays that represent sets or normalized records are sorted where the implementation requires stable semantic identity.

Fact and GraphEdge ids produced by fusion are content-addressed. This prevents random runtime ids from creating false semantic drift between equivalent observations.

## Drift detection

`compareEvidenceCapsules(previous, next)` distinguishes semantic drift from observation metadata changes.

If `evidenceDigest` is unchanged, Omni reports no semantic evidence drift even though the concrete observation root may differ.

When the digest changes, drift is decomposed into:

- source additions/removals;
- source live/silent state changes;
- source payload changes;
- fact additions/removals/value changes;
- graph count/topology changes;
- lattice leader/confidence/matrix changes.

A lattice change or source transition from live to silent is classified as major drift by the current implementation.

## Import and export

The UI can export capsules as JSON and import them again. Imports are verified before persistence. Malformed schema/version data or failed integrity checks are rejected.

The UI limits imported capsule payload size before persistence. This is a resource-safety boundary, not a cryptographic property.

## Relationship to Autopilot

Every proof-carrying Autopilot round embeds a complete Evidence Capsule. The Autopilot round root additionally binds run-specific metadata, including capsule sealing metadata and planner state, that is outside the capsule's semantic identity model.

This separation is intentional:

```text
Evidence Capsule
  └─ proves one recorded world-model state

Autopilot round root
  └─ proves how that state participates in an ordered decision trace
```

## Relationship to QuantumCert

A capsule `rootDigest` can be used as a typed QuantumCert subject (`evidence-capsule`). QuantumCert then binds that exact digest into its proposal and hybrid binding material.

That operation attests the identity of the capsule supplied to QuantumCert. It does not validate the external truth of collector claims.

## Integrity claims and non-claims

A valid capsule supports the statement:

> The normalized artifact I am verifying is internally consistent with this root digest and its section digests.

It does not, by itself, support these stronger statements:

- every remote source was honest or accurate;
- no earlier local observation was deleted;
- the artifact was published at a specific time by an externally trusted authority;
- the underlying analytical conclusion is true.

For a broader boundary map, see [Architecture](ARCHITECTURE.md) and [Security model](../SECURITY.md).
