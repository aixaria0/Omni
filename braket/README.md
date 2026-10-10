# Amazon Braket Hybrid Jobs bridge

This directory is Omni's independent Python bridge for running one variational workload across local simulation, Amazon-managed simulators, or a QPU selected at runtime.

The bridge is intentionally separate from the browser Quantum Fabric. Browser statevector simulation must not be presented as managed or physical-device execution.

## What it runs

The Hybrid Job optimizes a single-qubit `RY(theta)` ansatz against:

```text
cost(theta) = (1 + <Z>) / 2
```

Each iteration evaluates:

- the current `<Z>` expectation;
- the current cost;
- a parameter-shift gradient using `theta ± π/2`;
- an updated parameter value.

Hybrid Jobs metrics include:

```text
cost
theta
gradient
final_cost
```

## Supported backends

| `BRAKET_BACKEND` | Device path                       | Execution mode                                          |
| ---------------- | --------------------------------- | ------------------------------------------------------- |
| `local`          | `local:braket/braket.local.qubit` | embedded `LocalSimulator` inside local Hybrid Jobs mode |
| `sv1`            | SDK `Devices.Amazon.SV1`          | Amazon-managed simulator                                |
| `dm1`            | SDK `Devices.Amazon.DM1`          | Amazon-managed simulator                                |
| `qpu`            | `BRAKET_QPU_ARN`                  | runtime-selected Amazon Braket QPU device ARN           |

The algorithm code does not change when the backend changes. Device selection is resolved before the `@hybrid_job` wrapper is constructed, and the packaged job body uses `get_job_device_arn()` so execution matches the declared Hybrid Job device.

## Requirements

- Python 3.12 environment recommended for this subproject
- `amazon-braket-sdk>=1.127,<2`
- Docker when using Braket local Hybrid Jobs mode
- AWS account/configuration for managed simulator or QPU execution

Create an isolated environment:

```bash
cd braket
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

## Credentials

AWS credentials are **not** stored in this repository.

Managed runs use the normal AWS SDK credential chain. Do not put AWS access keys, secret keys, or session tokens in `braket.env.example` or any committed environment file.

## Configuration

Copy the non-secret template if you want a local configuration file:

```bash
cp braket.env.example braket.local.env
```

`run_job.py --env-file` loads simple `KEY=VALUE` pairs and does not override environment variables that are already set.

Available configuration:

| Variable                     | Default       | Purpose                             |
| ---------------------------- | ------------- | ----------------------------------- |
| `BRAKET_BACKEND`             | `local`       | `local`, `sv1`, `dm1`, or `qpu`     |
| `BRAKET_QPU_ARN`             | empty         | required when backend is `qpu`      |
| `BRAKET_ROLE_ARN`            | SDK default   | optional Hybrid Jobs execution role |
| `BRAKET_S3_OUTPUT`           | SDK default   | optional output S3 path             |
| `BRAKET_INSTANCE_TYPE`       | `ml.m5.large` | managed Hybrid Job instance type    |
| `BRAKET_VOLUME_GB`           | `30`          | managed job volume size             |
| `BRAKET_MAX_RUNTIME_SECONDS` | `3600`        | managed job stopping condition      |
| `BRAKET_JOB_NAME`            | SDK-generated | optional job name                   |

## Dry-run first

Resolve configuration before submitting a managed job:

```bash
BRAKET_BACKEND=sv1 python run_job.py --dry-run
```

The dry run prints the resolved backend, device ARN, local/managed mode, instance settings, output path, and algorithm parameters without submitting a job.

## Examples

### Local

```bash
BRAKET_BACKEND=local \
python run_job.py --iterations 5 --shots 100
```

### SV1

```bash
BRAKET_BACKEND=sv1 \
python run_job.py --iterations 20 --shots 1000
```

### DM1

```bash
BRAKET_BACKEND=dm1 \
python run_job.py --iterations 20 --shots 1000
```

### QPU

```bash
BRAKET_BACKEND=qpu \
BRAKET_QPU_ARN='arn:aws:braket:REGION::device/qpu/PROVIDER/DEVICE' \
python run_job.py --iterations 10 --shots 100
```

QPU availability, regions, queueing, pricing, and device-specific constraints are external AWS concerns and can change independently of this repository. Validate the selected device and account configuration before submission.

## Algorithm controls

`run_job.py` accepts:

```text
--iterations
--shots
--learning-rate
--initial-theta
--env-file
--dry-run
--no-monitor
```

Basic argument validation rejects iterations/shots below one.

## Monitoring behavior

Managed runs collect:

- job logs via `job.logs(wait=True)`;
- job metrics via `job.metrics()`;
- job result via `job.result()`;
- job ARN and name.

Local mode returns the local result and does not manufacture CloudWatch-style metrics.

Use `--no-monitor` to submit and print job identity without waiting for logs/results.

## Files

```text
braket_hybrid_job_template.py  backend registry, configuration, job decorator, algorithm
run_job.py                     CLI launcher + env-file loader
requirements.txt               Python dependency contract
braket.env.example             non-secret configuration template
```

## Trust boundary

A Braket job can establish managed execution identity and result/log provenance for that job path. It does not automatically prove that an external OSINT assertion or analytical hypothesis is true.

The browser QuantumCert layer and the Braket execution layer should therefore be described separately:

- **QuantumCert** — local witness/quorum/binding record;
- **Braket Hybrid Job** — managed/local AWS SDK execution record.

## Upstream references

- [Amazon Braket Hybrid Jobs](https://docs.aws.amazon.com/braket/latest/developerguide/braket-jobs.html)
- [Hybrid Job decorator](https://docs.aws.amazon.com/braket/latest/developerguide/braket-hybrid-job-decorator.html)
- [Local mode](https://docs.aws.amazon.com/braket/latest/developerguide/braket-jobs-local-mode.html)
- [Amazon Braket SDK](https://amazon-braket-sdk-python.readthedocs.io/)
