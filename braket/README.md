# Omni · Amazon Braket Hybrid Jobs

A production-oriented bridge for running the same iterative variational algorithm on an embedded local simulator, Amazon-managed simulators, or a QPU selected at runtime.

## Runtime

Amazon Braket's default Hybrid Jobs container supports Python 3.12. For local Hybrid Jobs mode, Docker must be installed and running.

```bash
cd braket
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

AWS credentials are **not** stored in this repository. Managed runs use the normal AWS SDK credential chain and require Amazon Braket to be enabled in the account.

## One-line backend switch

```bash
# Embedded LocalSimulator inside a local Hybrid Job container
BRAKET_BACKEND=local python run_job.py --iterations 5 --shots 100

# Amazon SV1 managed simulator
BRAKET_BACKEND=sv1 python run_job.py --iterations 20 --shots 1000

# Amazon DM1 managed simulator
BRAKET_BACKEND=dm1 python run_job.py --iterations 20 --shots 1000

# A real QPU — only the device ARN changes
BRAKET_BACKEND=qpu \
BRAKET_QPU_ARN='arn:aws:braket:REGION::device/qpu/PROVIDER/DEVICE' \
python run_job.py --iterations 10 --shots 100
```

Before submitting anything, verify the resolved configuration:

```bash
BRAKET_BACKEND=sv1 python run_job.py --dry-run
```

You can also copy `braket.env.example` to a private local file and pass `--env-file /path/to/file`. Do not put AWS access keys in that file; use the normal AWS credential mechanisms.

## Managed output / role configuration

Optional runtime variables:

```bash
export BRAKET_ROLE_ARN='arn:aws:iam::ACCOUNT:role/BraketJobsExecutionRole'
export BRAKET_S3_OUTPUT='s3://YOUR-BUCKET/omni/hybrid-jobs'
export BRAKET_INSTANCE_TYPE='ml.m5.large'
export BRAKET_VOLUME_GB=30
export BRAKET_MAX_RUNTIME_SECONDS=3600
```

If `BRAKET_S3_OUTPUT` is omitted, the Braket SDK uses its default jobs bucket/path. If `BRAKET_ROLE_ARN` is omitted, the SDK resolves the default Braket jobs role.

## Algorithm

The decorated function minimizes

`cost(theta) = (1 + <Z>)/2`

for a single-qubit `RY(theta)` ansatz. Every iteration evaluates the current cost and a parameter-shift gradient, then logs:

- `cost`
- `theta`
- `gradient`
- `final_cost`

The algorithm constructs its device **inside** the decorated function. `get_job_device_arn()` ensures the device used by the algorithm matches the device declared to Hybrid Jobs. Embedded `local:*` identifiers route to `LocalSimulator`; AWS ARNs route to `AwsDevice`.

## Monitoring contract

Managed jobs call `job.logs(wait=True)`, `job.metrics()`, and `job.result()`. These expose CloudWatch-backed logs/metrics plus the final job result. Local mode returns local container output/result and does not pretend that CloudWatch telemetry exists.

Use `--no-monitor` when you only want to submit and print the job identity.

## Files

- `braket_hybrid_job_template.py` — backend registry, configuration, decorator factory, algorithm, monitoring
- `run_job.py` — CLI launcher, env-file loader, dry-run support
- `requirements.txt` — dependencies installed in the Hybrid Job environment
- `braket.env.example` — non-secret configuration template

## References

- Amazon Braket Hybrid Job decorator: https://docs.aws.amazon.com/braket/latest/developerguide/braket-hybrid-job-decorator.html
- Local mode: https://docs.aws.amazon.com/braket/latest/developerguide/braket-jobs-local-mode.html
- Local simulator: https://docs.aws.amazon.com/braket/latest/developerguide/braket-send-to-local-simulator.html
- SDK API: https://amazon-braket-sdk-python.readthedocs.io/en/stable/_apidoc/braket.jobs.hybrid_job.html
