# DAG Orchestrator Evaluation — Plot Lines Pipeline
*2026-03-13 — for ARCH1/ARCH1b*

## Requirements

- 5 stages: Weather → Dialogue → Refinement → Email (+ Art independent)
- 200-2000 combos at scale, parallel fan-out within stages
- GPU fencing: exclusive VRAM per stage type (art / dialogue / refinement)
- Per-combo retry without re-running the pipeline
- Asset caching: skip what's already built today
- Single Ubuntu server (Blackwell), no cloud, no K8s
- Python-native

---

## Candidates

### 1. Dagster

| Criteria | Assessment |
|----------|-----------|
| **Install** | `pip install dagster dagster-webserver`. Pulls ~80 deps. Needs a metadata DB (SQLite default, Postgres for prod). Daemon process (`dagster-daemon`) for schedules/sensors. |
| **Runtime overhead** | Web UI + daemon = ~200-400MB idle. Startup ~5s. Not heavy but not invisible. |
| **Local-only** | ✅ Fully local. No cloud account needed. `dagster dev` for development, `dagster-daemon` for production schedules. |
| **Parallelism** | Built-in `DynamicOut` for fan-out. Multiprocess executor runs ops in separate processes. Can configure max concurrency. |
| **GPU fencing** | No native GPU concept, but has **resource limits** — define `gpu` as a resource with max 1 concurrent user. Stages tag themselves as GPU consumers. This actually works well. |
| **Retry/backfill** | ✅ Per-op retry policies. Backfill UI lets you re-run specific partitions (combos). First-class concept. |
| **Asset caching** | ✅ Core concept — "Software-Defined Assets." If the asset exists and inputs haven't changed, skip. This is what Dagster is built for. |
| **Learning curve** | Medium. Asset-based thinking takes adjustment. ~100 lines for our 5-stage pipeline definition, but the mental model is different from scripts. |
| **Community** | ~12K GitHub stars. Very active. Backed by Elementl (well-funded). Regular releases. Not going anywhere. |
| **Honest take** | Most complete option. The asset model maps perfectly to our stages (weather asset → dialogue asset → prose asset). Resource limits handle GPU fencing natively. The daemon + web UI feels heavy for a newsletter pipeline, but at 200+ combos you'll want that visibility. **Right-sized for where we're going, slightly heavy for where we are.** |

### 2. Prefect

| Criteria | Assessment |
|----------|-----------|
| **Install** | `pip install prefect`. Lighter than Dagster (~50 deps). SQLite metadata by default. |
| **Runtime overhead** | Prefect server (`prefect server start`) = ~150-300MB. Can also run without server (just `flow.run()`). |
| **Local-only** | ⚠️ Works locally but cloud-push is strong. Prefect 2/3 moved toward Prefect Cloud. Self-hosted server works but docs steer you to cloud. |
| **Parallelism** | `task.map()` for fan-out. Concurrent task runner (threads or Dask). Simple and Pythonic. |
| **GPU fencing** | No native concept. Would need concurrency limits on task tags. Doable but manual. |
| **Retry/backfill** | ✅ Per-task retry with configurable policies. No built-in partition/backfill like Dagster — you'd loop manually. |
| **Asset caching** | ⚠️ Has "result persistence" and caching but it's not the core abstraction like Dagster. You add it, it's not default. |
| **Learning curve** | Low. Decorators on functions. `@flow`, `@task`, done. Most Pythonic option. |
| **Community** | ~18K GitHub stars. Active but Prefect has pivoted multiple times (Prefect 1 → 2 → 3). Some community fatigue. |
| **Honest take** | Easiest to start with. Most Pythonic. But the cloud-push is annoying, the pivots raise questions about long-term API stability, and asset caching isn't first-class. **Best for quick wins, but you might outgrow it or get annoyed by the cloud nags.** |

### 3. Hamilton

| Criteria | Assessment |
|----------|-----------|
| **Install** | `pip install sf-hamilton`. Tiny — ~10 deps. No daemon, no DB, no server. |
| **Runtime overhead** | Near zero. It's a library, not a service. Import it, call it. |
| **Local-only** | ✅ Fully local. It's just Python functions wired into a DAG. |
| **Parallelism** | ⚠️ Not built in. Hamilton defines the DAG; you bring your own executor. Can use `concurrent.futures`, Ray, or Dask. Extra wiring. |
| **GPU fencing** | ❌ No concept. Fully DIY. |
| **Retry/backfill** | ❌ No concept. Fully DIY. |
| **Asset caching** | ⚠️ Has `@cache` decorator but it's basic. No partition-aware caching. |
| **Learning curve** | Lowest. Functions with type hints = DAG nodes. If you know Python, you know Hamilton in 10 minutes. |
| **Community** | ~2K GitHub stars. Small but focused. DAGWorks (the company) is active. Niche but loved. |
| **Honest take** | Beautiful for DAG definition but missing everything else. You'd pair it with a Postgres job table for retry, a semaphore for GPU fencing, and a process pool for parallelism. At that point you've built half of Dagster yourself. **Right-sized for 15 combos, underkill for 200+.** |

---

## Other Options Considered

### Flyte
- Kubernetes-native. Overkill for single server. Skip.

### Mage
- Web-based IDE focus. More for data analysts than pipeline engineering. Skip.

### Windmill
- Script-based workflow engine (TypeScript/Python/Go). Interesting but young, small community. Self-hosted but heavy (Postgres + workers). Worth watching but not proven enough.

### Temporal
- Durable execution engine. Very powerful for long-running workflows with retries. But heavy (Go server + SDK). More suited for microservices than a GPU pipeline.

### Hatchet
- Newer (2024-2025). Task queue + DAG. Lightweight, Python SDK. Postgres-backed. Worth a look but very early — small community, API still shifting.

### Custom `dispatch-dag.py`
- 200-300 lines. Postgres `dispatch_jobs` table. Python `ProcessPoolExecutor` for parallelism. Semaphore file for GPU fencing. `while True: poll table, fire ready jobs, sleep 5`.
- Pro: zero deps, total control, fits in your head.
- Con: you build retry, backfill, monitoring, logging, error handling from scratch. At 200+ combos, that's a real maintenance burden.

---

## Recommendation

**For today (15 combos):** Custom script or Hamilton. Ship fast, iterate.

**For tomorrow (200+ combos):** Dagster. The asset model is our pipeline. Resource limits are our GPU fencing. Partitions are our combos. Backfill is our retry story.

**Pragmatic path:** Start with custom `dispatch-dag.py` now (it's almost what `garden-dispatch.py` already is). When combo count crosses ~50, migrate to Dagster. The stage definitions won't change — just the orchestration layer around them.

**Or:** If you want to learn Dagster now while the pipeline is simple, it's easier to adopt early than migrate later. The investment is ~2 days of setup for a foundation that scales to 2000 combos without rethinking.

---

*See ARCH1 and ARCH1b in TODO.md for the full architecture spec.*
