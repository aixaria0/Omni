#!/usr/bin/env python3
"""CLI launcher for the Omni Amazon Braket Hybrid Jobs template."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from braket_hybrid_job_template import HybridJobConfig, collect_job, submit_job


def load_env_file(path: str | None) -> None:
    if not path:
        return
    env_path = Path(path).expanduser().resolve()
    if not env_path.exists():
        raise FileNotFoundError(f"Environment file not found: {env_path}")
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Run Omni's variational Braket Hybrid Job")
    p.add_argument("--iterations", type=int, default=20)
    p.add_argument("--shots", type=int, default=1000)
    p.add_argument("--learning-rate", type=float, default=0.2)
    p.add_argument("--initial-theta", type=float, default=0.3)
    p.add_argument("--env-file", help="Optional local env file; never commit credentials")
    p.add_argument("--dry-run", action="store_true", help="Resolve configuration without submitting")
    p.add_argument("--no-monitor", action="store_true", help="Submit and print job identity only")
    return p


def main() -> int:
    args = parser().parse_args()
    if args.iterations < 1:
        raise SystemExit("--iterations must be >= 1")
    if args.shots < 1:
        raise SystemExit("--shots must be >= 1")

    load_env_file(args.env_file)
    config = HybridJobConfig.from_env()
    summary = {
        "backend": config.backend,
        "device_arn": config.device_arn,
        "local": config.local,
        "instance_type": None if config.local else config.instance_type,
        "s3_output": config.s3_output,
        "job_name": config.job_name,
        "iterations": args.iterations,
        "shots": args.shots,
    }
    print(json.dumps(summary, indent=2))

    if args.dry_run:
        return 0

    job = submit_job(
        config=config,
        iterations=args.iterations,
        shots=args.shots,
        learning_rate=args.learning_rate,
        initial_theta=args.initial_theta,
    )
    print(f"job_name={job.name}")
    print(f"job_arn={job.arn}")

    if args.no_monitor:
        return 0

    payload = collect_job(job, local=config.local)
    print(json.dumps(payload, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
