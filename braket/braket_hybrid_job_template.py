"""Production-oriented Amazon Braket Hybrid Jobs template for Omni.

Backend switching is controlled by BRAKET_BACKEND without changing algorithm code.
The decorated job body is intentionally self-contained because Hybrid Jobs packages
function source for remote execution.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from braket.devices import Devices
from braket.jobs.config import InstanceConfig, OutputDataConfig, StoppingCondition
from braket.jobs.hybrid_job import hybrid_job

REQUIREMENTS = Path(__file__).with_name("requirements.txt").resolve()
LOCAL_DEVICE = "local:braket/braket.local.qubit"

BACKENDS: dict[str, str] = {
    "local": LOCAL_DEVICE,
    "sv1": Devices.Amazon.SV1.value,
    "dm1": Devices.Amazon.DM1.value,
}


def resolve_device_arn(backend: str, qpu_arn: str | None = None) -> str:
    """Resolve a stable backend name into the exact Braket device string."""
    normalized = backend.strip().lower()
    if normalized == "qpu":
        value = (qpu_arn or os.getenv("BRAKET_QPU_ARN", "")).strip()
        if not value:
            raise ValueError("BRAKET_QPU_ARN is required when BRAKET_BACKEND=qpu")
        if not value.startswith("arn:aws:braket:"):
            raise ValueError("BRAKET_QPU_ARN must be an Amazon Braket device ARN")
        return value
    try:
        return BACKENDS[normalized]
    except KeyError as exc:
        allowed = ", ".join([*BACKENDS, "qpu"])
        raise ValueError(f"Unknown BRAKET_BACKEND={backend!r}; choose {allowed}") from exc


@dataclass(frozen=True)
class HybridJobConfig:
    backend: str = "local"
    qpu_arn: str | None = None
    role_arn: str | None = None
    s3_output: str | None = None
    instance_type: str = "ml.m5.large"
    volume_gb: int = 30
    max_runtime_seconds: int = 3600
    job_name: str | None = None

    @property
    def device_arn(self) -> str:
        return resolve_device_arn(self.backend, self.qpu_arn)

    @property
    def local(self) -> bool:
        return self.backend.strip().lower() == "local"

    @classmethod
    def from_env(cls) -> "HybridJobConfig":
        return cls(
            backend=os.getenv("BRAKET_BACKEND", "local"),
            qpu_arn=os.getenv("BRAKET_QPU_ARN") or None,
            role_arn=os.getenv("BRAKET_ROLE_ARN") or None,
            s3_output=os.getenv("BRAKET_S3_OUTPUT") or None,
            instance_type=os.getenv("BRAKET_INSTANCE_TYPE", "ml.m5.large"),
            volume_gb=int(os.getenv("BRAKET_VOLUME_GB", "30")),
            max_runtime_seconds=int(os.getenv("BRAKET_MAX_RUNTIME_SECONDS", "3600")),
            job_name=os.getenv("BRAKET_JOB_NAME") or None,
        )


def build_hybrid_job(config: HybridJobConfig) -> Callable[..., Any]:
    """Construct the decorated job only after runtime configuration is resolved."""
    decorator_options: dict[str, Any] = {
        "device": config.device_arn,
        "dependencies": str(REQUIREMENTS),
        "local": config.local,
        "job_name": config.job_name,
        "role_arn": config.role_arn,
        "tags": {"project": "Omni", "workload": "variational-hybrid"},
    }

    if not config.local:
        decorator_options.update(
            instance_config=InstanceConfig(
                instanceType=config.instance_type,
                volumeSizeInGb=config.volume_gb,
                instanceCount=1,
            ),
            stopping_condition=StoppingCondition(
                maxRuntimeInSeconds=config.max_runtime_seconds,
            ),
        )
        if config.s3_output:
            decorator_options["output_data_config"] = OutputDataConfig(
                s3Path=config.s3_output,
            )

    # Do not pass explicit None job_name/role values; this preserves SDK defaults.
    decorator_options = {key: value for key, value in decorator_options.items() if value is not None}

    @hybrid_job(**decorator_options)
    def variational_hybrid_job(
        iterations: int = 20,
        shots: int = 1000,
        learning_rate: float = 0.2,
        initial_theta: float = 0.3,
    ) -> dict[str, Any]:
        # Imports remain inside the decorated function so the generated algorithm
        # script is self-contained when Braket packages it for the job container.
        import math

        from braket.aws import AwsDevice
        from braket.circuits import Circuit, Observable
        from braket.devices import LocalSimulator
        from braket.jobs import get_job_device_arn
        from braket.jobs.metrics import log_metric

        device_arn = get_job_device_arn()
        device = LocalSimulator() if device_arn.startswith("local:") else AwsDevice(device_arn)

        def expectation_z(theta: float) -> float:
            circuit = Circuit().ry(0, theta).expectation(Observable.Z(), 0)
            task = device.run(circuit, shots=shots)
            return float(task.result().values[0])

        theta = float(initial_theta)
        history: list[dict[str, float | int]] = []

        for iteration in range(int(iterations)):
            expectation = expectation_z(theta)
            cost = 0.5 * (1.0 + expectation)

            plus = expectation_z(theta + math.pi / 2)
            minus = expectation_z(theta - math.pi / 2)
            gradient = 0.25 * (plus - minus)

            log_metric("cost", cost, iteration_number=iteration)
            log_metric("theta", theta, iteration_number=iteration)
            log_metric("gradient", gradient, iteration_number=iteration)

            history.append(
                {
                    "iteration": iteration,
                    "cost": cost,
                    "theta": theta,
                    "gradient": gradient,
                }
            )
            theta -= learning_rate * gradient

        final_expectation = expectation_z(theta)
        final_cost = 0.5 * (1.0 + final_expectation)
        log_metric("final_cost", final_cost, iteration_number=int(iterations))

        return {
            "backend": device_arn,
            "iterations": int(iterations),
            "shots": int(shots),
            "final_theta": theta,
            "final_expectation_z": final_expectation,
            "final_cost": final_cost,
            "history": history,
        }

    return variational_hybrid_job


def submit_job(
    *,
    config: HybridJobConfig | None = None,
    iterations: int = 20,
    shots: int = 1000,
    learning_rate: float = 0.2,
    initial_theta: float = 0.3,
):
    resolved = config or HybridJobConfig.from_env()
    runner = build_hybrid_job(resolved)
    return runner(
        iterations=iterations,
        shots=shots,
        learning_rate=learning_rate,
        initial_theta=initial_theta,
    )


def collect_job(job, *, local: bool) -> dict[str, Any]:
    """Collect logs/metrics/results without pretending local mode has CloudWatch."""
    if local:
        return {"result": job.result(), "metrics": None}

    job.logs(wait=True)
    return {
        "result": job.result(),
        "metrics": job.metrics(),
        "arn": job.arn,
        "name": job.name,
    }
