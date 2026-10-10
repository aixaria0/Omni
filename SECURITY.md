# Security policy

Omni processes public-source infrastructure data and contains cryptographic integrity, autonomous collection-planning, and quantum-simulation components. Security reports should distinguish vulnerabilities in those mechanisms from disagreements about the truth of external data sources.

## Reporting a vulnerability

Please do not publish exploit details in a public issue before maintainers have had a chance to investigate.

Preferred reporting path:

1. use GitHub private vulnerability reporting for this repository when available;
2. otherwise contact the repository owner through a private channel and include the affected commit, component, reproduction steps, and expected impact.

Useful reports are specific and reproducible. Include proof artifacts or minimal fixtures when the issue concerns digest, replay, or certificate verification.

## High-value security areas

Reports are especially useful for defects involving:

- acceptance of a tampered Evidence Capsule;
- Autopilot receipt verification that fails to detect altered round/action/checkpoint data;
- planner replay that is non-deterministic for the same recorded state;
- SHA3-512 mismatches or canonicalization collisions introduced by implementation errors;
- certificate subject substitution or binding bypass;
- Ed25519 vote verification bypass;
- cross-user/session data exposure;
- server-side request handling that reaches unintended private resources;
- leaked secrets, credentials, or cloud identifiers that should not be public;
- autonomous pivot behavior escaping the intended IP/domain/ASN infrastructure boundary.

## Responsible-use boundary

OmniTrace is designed for public infrastructure research, defensive security, journalism, and similar legitimate analysis workflows.

The autonomous runtime is intentionally constrained to public infrastructure pivots:

- IP addresses;
- domains;
- ASNs.

It is not intended to autonomously target private individuals, deanonymize people, exploit systems, or convert public metadata into invasive personal surveillance.

## Collector trust

A successful collector response means Omni received and processed data from that source path. It does not mean:

- the source is correct;
- the data is current;
- independent sources are statistically independent;
- a threat-intelligence tag proves malicious behavior.

Treat collector output as evidence to be compared, not a verdict.

## Evidence Capsule security model

Evidence Capsules provide tamper detection for the artifact supplied to the verifier.

They do **not** provide an append-only publication history. Browser-local capsule archives can be deleted or rolled back by someone controlling the browser profile.

`evidenceDigest` identifies normalized semantic evidence. `rootDigest` identifies a concrete observation state. Neither digest is a claim of factual truth.

## Autopilot receipt security model

Autopilot receipts add an ordered hash chain and deterministic planner replay over proof-carrying rounds.

A valid receipt establishes self-consistency relative to its `runRoot`:

- embedded capsules verify;
- Stress checkpoints can be recomputed;
- round roots chain correctly;
- planner decisions replay from recorded state;
- the final run root matches the trace.

External authenticity requires separately preserving or attesting the `runRoot`. A valid receipt alone does not prove who first created it or when it was first published.

## QuantumCert security model

QuantumCert combines:

- quantum witness/simulation output;
- four fresh WebCrypto Ed25519 validator identities;
- a threshold of 3/4 verified votes;
- SHA3-512 proposal/quorum/binding digests;
- optional typed subject binding.

The validators are ephemeral certificate-local keys. This design tests quorum and tamper behavior but does not represent a separately administered production BFT validator network.

Binding an Evidence Capsule or Autopilot run root into QuantumCert attests that exact digest inside the certificate. It does not validate the external truth of the subject's claims.

## Quantum simulation boundary

The browser 12-qubit register is a simulator. Results from it must not be represented as physical quantum-hardware execution.

Managed simulator/QPU execution belongs to the Amazon Braket bridge and should be tied to the relevant Braket job identity, logs, metrics, and result path.

## AWS and secrets

The repository must not contain:

- AWS access key ids or secret access keys;
- session tokens;
- private signing keys;
- API keys intended to remain secret;
- credential-bearing `.env` files.

The Braket bridge uses the standard AWS SDK credential chain. `braket.env.example` is configuration-only and must remain non-secret.

## Dependency and CI hygiene

CI installs JavaScript dependencies from `package-lock.json` with `npm ci`. Product correctness gates include core/OSINT/quantum tests, TypeScript checks, and the application build.

Security-sensitive dependency changes should be reviewed for both runtime and build-time effects. A clean dependency audit is useful but does not replace application-level testing.

## Known structural limitations

The following are known design limitations rather than hidden guarantees:

- local browser persistence is mutable/deletable;
- in-browser certificate validators do not have externally anchored identities;
- Stress robustness is model-relative, not a calibrated truth probability;
- public-source availability can change between runs;
- hashes prove artifact integrity/identity, not truth;
- the Braket bridge requires external AWS account configuration for managed execution.
