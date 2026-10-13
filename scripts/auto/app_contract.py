"""Phone app contract: daily live check of the /api/app/v1 routes on whatsittome.org (scripts/app-contract.mjs).

Records the result in job_runs, like the other jobs, so /status and the weekly review show it. A failed check means
the website would break the phone apps already installed (contract: lib/appApi.ts).
"""
import os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, job

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://whatsittome.org"

with job("phone app contract") as state:
    r = subprocess.run(["node", "--experimental-strip-types", "scripts/app-contract.mjs", BASE], cwd=ROOT,
                       capture_output=True, text=True, timeout=300)
    print(r.stdout, end="", flush=True)
    if r.stderr: print(r.stderr, end="", file=sys.stderr, flush=True)
    lines = r.stdout.splitlines()
    state["rows"] = sum(1 for l in lines if l.startswith(("ok ", "FAIL ")))
    if r.returncode != 0:
        fails = [l for l in lines if l.startswith("FAIL ")]
        raise RuntimeError("; ".join(fails)[:800] or f"contract check exited {r.returncode}")
    warns = [l for l in lines if l.startswith("warn ")]
    state["note"] = f"{len(warns)} lookup(s) unavailable, not counted" if warns else "every reply matched the v1 contract"
