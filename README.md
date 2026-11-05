# AI Visibility Intelligence Platform

## Project Overview

A platform that measures how visible a business is in AI-driven search. For a business profile it discovers the queries that matter, scores each one's opportunity, and produces content recommendations to close visibility gaps.

- `backend/` – Flask REST API and the three-agent pipeline
- `frontend/` – Angular dashboard that consumes the API

## Features

- **Dashboard:** total profiles, total queries, average opportunity score, recent pipeline runs (all from `GET /dashboard/summary`).
- **Business profile form:** Reactive Form with required-field and bare-domain validation (rejects `http(s)://`), removable competitor chips, inline `mat-error`s.
- **Profile detail:** profile info, **Run Pipeline** button (the pipeline never starts automatically after onboarding), per-stage status, summary card, and tabs for Queries, Opportunity Chart and Recommendations.
- **Stage-level retry:** if a run fails, a **Retry** button resumes it at the failed stage; completed stages are not executed again.
- **Queries table:** server-side pagination, min-score slider, visibility filter, colour-coded score chips (green ≥ 0.7, yellow 0.4–0.69, red < 0.4), per-row Recheck, CSV export.
- **Opportunity chart:** bars per query (blue = domain visible, orange = not visible, labels cut to 30 characters, y-axis 0–1).
- **Recommendations:** Material cards with content-type and priority badges, keyword chips and a priority toggle filter.
- Dark mode, skeleton loaders, snackbar notifications, route animations, friendly empty and error states.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.11+, Flask 3, Flask-SQLAlchemy, Flask-Migrate (Alembic), Flask-CORS, psycopg 3, google-genai (Gemini) |
| Database | PostgreSQL (Neon) – SQLite fallback for local/dev and tests |
| Frontend | Angular 20 (standalone components, signals, lazy routes, strict TypeScript), Angular Material 20, `@angular/animations`, Chart.js 4 + ng2-charts 8 (v11 needs Angular 22), RxJS 7, Reactive Forms |
| Testing | pytest – 29 tests (backend), Karma/Jasmine – 18 tests (frontend) |

## Architecture

```
Angular (4200) ──HTTP/JSON──▶ Flask API (5000, /api/v1) ──▶ PostgreSQL / SQLite
                                   │
                                   └─▶ services/pipeline.py ─▶ agents (discovery → scoring → recommendation)
```

```
backend/
├── run.py                    entry point
├── config.py                 env-based config (development / production / testing)
├── app/
│   ├── __init__.py           create_app() factory
│   ├── extensions.py         CORS, SQLAlchemy, Migrate
│   ├── errors.py             JSON error handlers
│   ├── models/               profile.py (BusinessProfile, PipelineRun), query.py (DiscoveredQuery), recommendation.py (ContentRecommendation)
│   ├── agents/               base.py, discovery.py, scoring.py, recommendation.py
│   ├── api/                  blueprints: health, profiles, queries, pipeline_runs, dashboard
│   ├── services/pipeline.py  orchestrator
│   └── utils/scoring.py
├── tests/
├── migrations/
├── .env.example
└── requirements.txt
```

```
frontend/src/
├── environments/             environment.ts (dev), environment.prod.ts (production)
└── app/
    ├── core/                 config (api.config.ts), interceptors (error, auth), services (notification, theme, user), models (ApiError)
    ├── shared/               reusable UI (header, stat-card, empty/error/loading states, status-badge, sidebar, navbar),
    │                         pipes, utils (csv, date, api-response)
    ├── layouts/              main-layout (sidenav + route animation), auth-layout
    ├── features/             each feature is lazy-loaded and owns api/, services/, models/, utils/, components/
    │   ├── dashboard/
    │   ├── profiles/         profile-form, profile-detail, profile-list, pipeline-summary-card, ...
    │   ├── queries/          query-list (table), query-filters, opportunity-chart
    │   └── recommendations/  recommendation-list, recommendation-card
    ├── app.routes.ts · app.config.ts
```

Frontend rules: every HTTP call lives in a feature `api/*.service.ts` (components never use `HttpClient`), API responses are normalised by mappers into typed interfaces, and every view has loading, error and empty states.

## Quick Start (under 5 minutes)

**Option A – setup script** (needs Python 3.11+ and Node 22+):

```powershell
.\setup.ps1                  # macOS/Linux/Git Bash: ./setup.sh
# edit backend\.env and set GEMINI_API_KEY, then in two terminals:
cd backend; .venv\Scripts\Activate.ps1; python run.py
cd frontend; npm start          # http://localhost:4200
```

**Option B – Docker** (needs Docker only):

```bash
copy backend\.env.example backend\.env     # set GEMINI_API_KEY (and DATABASE_URL for Postgres, optional)
docker compose up --build                  # app: http://localhost:4200 · API: http://localhost:5000/api/v1
```

The compose file builds the Flask image (migrations run on start, served by gunicorn) and an nginx image serving the Angular build and proxying `/api` to the backend.

Manual, step-by-step instructions follow in [Backend Setup](#backend-setup) and [Frontend Setup](#frontend-setup).

## Prerequisites

- **Python 3.11+** (`python --version`)
- **Node.js 22.12+ or 24** and npm (`node -v`)
- **Git**
- Optional: a PostgreSQL database such as [Neon](https://neon.tech). Without one the backend uses a local SQLite file.

Commands are for **Windows PowerShell**. On macOS/Linux use `python3`, `source .venv/bin/activate` and `cp` instead of `copy`.

---

## Backend Setup

### Installation

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1      # if blocked: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pip install -r requirements.txt
copy .env.example .env
```

### Environment Variables

Edit `backend/.env` (never commit it – it is gitignored):

| Variable | Meaning | Default |
| --- | --- | --- |
| `FLASK_ENV` | `development`, `production` or `testing` | `development` |
| `SECRET_KEY` | Flask secret – change it | `change-me` |
| `CORS_ORIGINS` | Comma-separated origins allowed to call the API | `http://localhost:4200` |
| `HOST` / `PORT` | Bind address | `127.0.0.1` / `5000` |
| `DATABASE_URL` | Database connection URL | `sqlite:///app.db` |
| `GEMINI_API_KEY` | Google Gemini API key (required to run the pipeline) | – |
| `GEMINI_MODEL` | Gemini model id | `gemini-3.5-flash-lite` |
| `PIPELINE_ASYNC` | Run pipelines in a background thread (202 + polling) | `true` |

### Database Configuration

- **SQLite (default):** leave `DATABASE_URL=sqlite:///app.db`; nothing else to set up.
- **PostgreSQL / Neon:** set
  `DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`.
  Plain `postgres://` / `postgresql://` URLs are converted to the `psycopg` driver automatically, and connections use `pool_pre_ping` because Neon suspends idle connections (the first request after a pause can be slow).

### Database Migrations

The initial migration is committed in `backend/migrations/versions/`.

```powershell
$env:FLASK_APP = "run.py"
flask db upgrade                              # create / update tables
flask db migrate -m "describe change"         # after changing a model
```

### Running Flask

```powershell
python run.py        # or: flask run
```

While a pipeline runs (in a background thread), the terminal prints each agent's raw model response, the validated result and a summary of what was saved to the database.

API base: http://localhost:5000/api/v1 · health check: http://localhost:5000/api/v1/health → `{"status":"ok"}`

### Running Tests

```powershell
python -m pytest
```

Tests use an in-memory SQLite database and a fake LLM; no external services or API key needed.

---

## Frontend Setup

### Installation

In a second terminal:

```powershell
cd frontend
npm install
```

### Environment Configuration

| File | Used for | `apiUrl` |
| --- | --- | --- |
| `src/environments/environment.ts` | `npm start` / dev builds | `http://localhost:5000/api/v1` |
| `src/environments/environment.prod.ts` | production build (swapped in by `angular.json`) | `/api/v1` (needs a reverse proxy serving both apps on one origin) |

If you change the backend `HOST`/`PORT`, update `environment.ts`. The backend must list the frontend origin in `CORS_ORIGINS`.

### Running Angular

```powershell
npm start            # ng serve → http://localhost:4200
```

Other commands: `npm run build` (output in `frontend/dist/frontend`), `npm test` (18 Karma/Jasmine tests, needs Chrome).

**Daily workflow:** terminal 1 `cd backend; .venv\Scripts\Activate.ps1; python run.py` · terminal 2 `cd frontend; npm start` · open http://localhost:4200.

---

## AI Agent Architecture

**Model:** Google Gemini `gemini-3.5-flash-lite` via the `google-genai` SDK (set `GEMINI_API_KEY` / `GEMINI_MODEL` in `backend/.env`). Chosen for low latency and cost; every call asks for `application/json` output.

The pipeline runs **only when a user clicks "Run Pipeline"** (`POST /profiles/{uuid}/run`). Creating a profile never starts it.

`app/services/pipeline.py` orchestrates three agents, each subclassing `BaseAgent` (`agents/base.py`):

| # | Agent | What it does | Failure handling |
| --- | --- | --- | --- |
| 1 | Discovery | Profile → 10–20 distinct questions users ask AI assistants | Invalid/short output is retried once; if it still fails the run is `failed` at the discovery stage (nothing to score) |
| 2 | Scoring | Per query: estimated monthly volume, difficulty 0–100, and a *simulated AI answer* listing the domains it would cite. Visibility and position are computed in code by checking the profile's domain against that ordered list | Batches of 10, then one extra attempt for any queries the model skipped. Queries that still fail stay unscored (`domain_visible = null`, filter `status=unknown`) and the **stage is marked failed**; scores that succeeded are kept and a retry scores only the rest |
| 3 | Recommendation | Takes the top 5 not-visible queries by opportunity → 3–5 recommendations (`blog_post`/`landing_page`/`faq`, priority, rationale, keywords) | Invalid items (bad type/priority/index) are dropped; if none remain the stage fails but discovery and scoring results are kept and a retry runs only this stage |

Every prompt is a `system_instruction` with an explicit output contract, and each agent also passes a **JSON schema** (`RESPONSE_SCHEMA`) to Gemini so output is constrained to the expected shape (types, ranges, `enum`s, item counts). Shared safeguards in `BaseAgent`/`GeminiClient`: JSON parsing (tolerates code fences), per-agent schema validation, one retry on bad output, and up to 5 attempts with back-off on 429/5xx/timeouts, and the bare-list-or-object reply shapes Gemini produces are both accepted (the model is often "high demand"). Each run stores `tokens_used`, `queries_discovered` and `queries_scored`. Re-running a profile (a *new* run) replaces its previous queries and recommendations and executes all three stages.

**Stage-level retry.** Each `PipelineRun` stores `discovery_status`, `scoring_status`, `recommendation_status` (`pending|running|completed|failed`), `failed_stage`, `error_message` and `retry_count`. The orchestrator stops at the first failed stage and leaves later stages `pending`. `POST /pipeline-runs/{uuid}/retry` re-opens that same run and executes only stages that are not `completed`: Agent 1 ok + Agent 2 failed → retry runs Agent 2 (only the still-unscored queries) then Agent 3; Agent 1 and 2 ok + Agent 3 failed → retry runs Agent 3 only. A stage's data and its `completed` status are committed in one transaction, recommendations are replaced rather than appended, and the retry is claimed with an atomic `failed → running` update, so repeated or concurrent requests cannot run a stage twice or duplicate rows. Agent 2 counts as failed until every query is scored (the scores that succeeded are kept).

## API Documentation

Base URL: `http://localhost:5000/api/v1`. All bodies are JSON.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Liveness check → `{"status":"ok"}` |
| POST | `/profiles` | Create profile (`name`, `domain` – bare domain, `industry`, `description`, `competitors[]`) → 201 · 400 `{"error","errors"[]}` |
| GET | `/profiles` | List profiles, newest first *(extra)* |
| GET | `/profiles/{profile_uuid}` | One profile → 200 · 404 |
| POST | `/pipeline-runs/{run_uuid}/retry` | **Resume a failed run in place.** Completed stages are skipped and their saved results reused; only the failed and later stages execute. Returns the updated run (200 even if it fails again) · 404 unknown run · 409 if the run is not failed, is already running, or is not the profile's latest run |
| GET | `/pipeline-runs/{run_uuid}` | One pipeline run with its stage statuses |
| POST | `/profiles/{profile_uuid}/run` | Start the pipeline. With `PIPELINE_ASYNC=true` (default) it runs in a background thread and returns **202** with the run (`status: running`) immediately; the UI polls `GET /pipeline-runs/{uuid}` / `GET /profiles/{uuid}`. With `false` it blocks and returns 200. 409 if already running · 404 |
| GET | `/profiles/{profile_uuid}/queries` | `?min_score=0.5` `?status=visible\|not_visible\|unknown` `?page=1&per_page=20` → `{queries[], total, page, per_page}` sorted by opportunity desc · 400 on bad params |
| GET | `/profiles/{profile_uuid}/recommendations` | `{recommendations[]}` ordered high → low |
| POST | `/queries/{query_uuid}/recheck` | Re-score one query with Agent 2 → refreshed query · 404 · 502 if the model fails |
| GET | `/dashboard/summary` | Totals, average opportunity score, profiles, recent runs *(extra, powers the dashboard)* |

Query fields: `uuid, query_text, estimated_search_volume, competitive_difficulty, opportunity_score (0–1), domain_visible, visibility_position, discovered_at`. Recommendation fields: `recommendation_uuid, target_query_uuid, content_type, title, rationale, target_keywords[], priority`.

## Opportunity Score Formula

```
volume_score   = min(1, log10(volume + 1) / log10(100000 + 1))        # log scale, capped at 100k/month
ease           = 1 - difficulty / 100
visibility_gap = 1.0                       if the domain is not cited
                 clamp((position - 1) / 10) if cited at `position`       # already #1 -> 0
opportunity    = volume_score * (0.5 * ease + 0.5 * visibility_gap)      # 0.0 – 1.0
```

"Search volume × competitive gap": a query scores high only when many people ask it, the domain can realistically win it, and the domain is not already cited. Implemented in `app/utils/scoring.py` (unit-tested). Volume and difficulty are model estimates, not measured data.

## Error Handling

- Errors are JSON shaped `{"error": "<message>"}` (`app/errors.py`): HTTP exceptions keep their status code (400, 404, …); anything unexpected is logged and returned as 500 `{"error":"Internal server error"}`.
- Validation errors in routes return 400 with a specific message (e.g. `name is required`).
- The Angular `api-error.interceptor` converts `HttpErrorResponse` into an `ApiError` with a friendly message, shown via snackbars and error states.

## Design Decisions & Trade-offs

| Decision | Why | Trade-off |
| --- | --- | --- |
| Gemini `gemini-3.5-flash-lite` instead of GPT-4o/Claude | Chosen for this project; fast and cheap, supports JSON-schema structured output | Smaller model → noisier estimates; the "high demand" 503s need retries |
| Visibility is *simulated* (model lists the domains it would cite; code checks the profile's domain) | No access to real AI-assistant answers; keeps the visibility decision deterministic and testable | Not real measurement (see limitations) |
| Opportunity score is a documented, unit-tested formula in code, not asked from the LLM | Reproducible, explainable ordering | Weights (0.5/0.5, 100k volume cap) are judgement calls |
| Orchestrator = a small function with persisted stage statuses, no Celery/LangGraph | Simple, resumable, easy to read and test | Single-process background thread instead of a durable queue |
| Stage = unit of retry; stage data + status committed atomically | Retry never duplicates rows or repeats finished work | Retry granularity is a stage (scoring retries only unscored queries) |
| UUID primary keys everywhere, JSON columns for competitors / keywords | Matches the API (UUIDs in URLs), no enumeration | Slightly larger indexes than integer ids |
| SQLite by default, PostgreSQL (Neon) via `DATABASE_URL` | Zero-setup local run, production-grade option | SQLite behaves differently under concurrency |

## Evaluation Checklist (where each criterion lives)

| Criterion | Where to look |
| --- | --- |
| API design & Flask structure | `app/__init__.py` (factory), `app/api/*` blueprints, `app/errors.py` (JSON errors), CORS in `extensions.py`; 200/201/202/400/404/409/502 used consistently |
| Agent architecture | `app/agents/` (three agents + `BaseAgent`), `app/services/pipeline.py` (orchestrator, stage statuses, partial failures, retry) |
| Prompt engineering | `SYSTEM_INSTRUCTION` + `RESPONSE_SCHEMA` in each agent, validation + retry + fallback in `agents/base.py` |
| Data models & persistence | `app/models/` (UUID PKs, FKs, relationships), `migrations/versions/` |
| Opportunity score | `app/utils/scoring.py`, formula section above, `tests/test_scoring.py` |
| Frontend completeness | 6 views: dashboard, profile form, profile detail, queries table, opportunity chart, recommendations; Reactive Forms, typed models, lazy routes |
| Frontend API integration | `features/*/api/*.service.ts`; loading / error / empty states everywhere; no mock data |
| Code quality & README | strict TypeScript + strict templates, 29 backend and 18 frontend tests, this README, `setup.ps1` / `setup.sh` / `docker-compose.yml` |
| Bonus | async pipeline (202 + polling), dark mode, Docker, live stage polling, CSV export, route animations, skeleton loaders, tests |

## Known Limitations

- **Search volume, difficulty and "visibility" are LLM estimates/simulations**, not real SEO or live AI-answer data.
- Pipelines run in a background thread of the web process (no job queue such as Celery): runs are lost if the server restarts mid-run (a run stuck in `running` can be superseded by a new run after 10 minutes). The Gemini model sometimes answers 503 "high demand" (retried automatically, otherwise recorded as a failed stage that can be retried).
- No authentication; the signed-in user in the header is hard-coded in the frontend environment files. The auth interceptor/guard are inert placeholders.
- `GET /profiles/{uuid}/runs` lists all runs of a profile, but a retry is only allowed for the profile's latest run.
- Retrying re-runs whole stages from the failed one onward (scoring retries only unscored queries); there is no per-query retry except Recheck.
- The production frontend assumes a same-origin reverse proxy for `/api/v1` (provided by the Docker setup).

## AI Tools Disclosure

This project was built with AI assistance: **Claude Code (Claude Sonnet 5.5)** in VS Code generated and iterated on the Angular frontend, the Flask backend, agents, prompts, tests and documentation; all code was reviewed against the assessment requirements. The running product itself calls Google Gemini (`gemini-3.5-flash-lite`). All AI-generated code and docs should be reviewed by the team before use.
