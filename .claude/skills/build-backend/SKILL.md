---
name: build-backend
description: Autonomous pipeline to create a fully functional, production-ready Python backend (not mocked) based on frontend specs, schemas, and proposals. Use when the user requests backend generation, API implementation, or database setup for a feature. The skill builds the system end-to-end with zero user intervention, aggressively researching best practices when stuck, and prioritizing correct, high-quality Python code.
---

# Build-Backend Orchestrator

Run an autonomous, end-to-end pipeline to generate a real (unmocked) Python backend system. This agent operates with maximum autonomy because the user is frontend-focused and cannot provide backend guidance. Do not cut scope. If you hit a roadblock, research it, make the best architectural approximation, and keep building until it works.

## Inputs
- `$ARGUMENTS` — required. May be:
  - A proposal id (e.g. `PROP-0003`)
  - A free-form ask (e.g. "build the backend for the members bulk upload")
  - Path to frontend schemas or specs

## Source-of-truth locations (verify before using)
- Proposals: `proposals/PROP-*.md`
- Frontend Schemas (for API contracts): `schemas/**/*.json`
- Logs & Context: `agent_logs/`, `context/`
- Backend Project Root: `backend/` (or wherever the Python project is initialized)
- Environment constraints: Python, FastAPI (recommended), SQLAlchemy, Pydantic, Alembic (or equivalent based on existing codebase).

## Pipeline

### 1. DISCOVER — Context & Specs Parsing
- Read the provided proposal or ask.
- Read `agent_logs/usecases.json` (from `extract-usecase`) to deeply understand the business rules, validations, and expected domain logic before designing the data models.
- Scan the frontend `schemas/` to extract the exact API contracts (payloads, responses, error formats) that the frontend is expecting. The backend MUST honor these contracts perfectly.
- Read recent `agent_logs/` and `context/` to understand the overarching project context and any established constraints.
- Output: `agent_logs/build-backend/<run-id>/discover.log` detailing the parsed database entities, endpoints, and authentication constraints.

### 2. RESEARCH — Best Practices & Unblocking
- If the implementation requires interacting with an unknown library, complex algorithm, or cloud service, use `WebSearch` (or `WebFetch` / `Bash` with `curl` for direct API docs) to research Python best practices.
- Do not guess library usage. Research the exact syntax for the required Python libraries.
- Output: `agent_logs/build-backend/<run-id>/research.log` summarizing findings and the chosen architectural approach.

### 3. DESIGN — Architecture & Data Modeling
- Formulate a strict data model (e.g., SQLAlchemy ORM).
- Map out the API routes, ensuring 1:1 parity with the frontend's expected `fetch` calls.
- Define the business logic layer.
- **Do not ask the user for permission.** Assume your design is correct based on the specs and proceed. Do not cut scope or simplify the logic; build the complete use case.
- Output: `context/build-backend/<run-id>/design.md` containing the schema design and endpoint list.

### 4. BUILD — Implementation
- If this is the first run, initialize the Python backend project. If the backend already exists, **modify the existing Python server code** instead of starting from scratch.
- Create or update the Python files within the existing architecture.
- Implement the Database schema (migrations if necessary).
- Implement Pydantic models for validation (matching frontend JSON schemas).
- Implement the API routers and dependency injection (e.g., DB sessions, Auth).
- Implement the core business logic (services/controllers).
- Write real logic, **NOT MOCKS**. Connect to the database, process the data, handle errors correctly, and return standard HTTP responses.
- Output: `agent_logs/build-backend/<run-id>/build.log` listing all created/modified files.

### 5. VERIFY — Zero-Intervention Debugging
- Run Python linting and type checking (e.g., `ruff check .`, `mypy .`).
- Write and run basic integration tests (e.g., using `pytest` and `TestClient`) to ensure the endpoints actually work and return the correct shapes.
- **Crucial:** If errors occur, DO NOT ask the user for help. Read the stack trace, research the error if necessary, and fix it autonomously. Loop this step until the tests pass.
- Output: `agent_logs/build-backend/<run-id>/verify.log` detailing the test results and any autonomous fixes applied.

### 6. SHIP — Handoff
- Ensure the backend starts up without crashing.
- Document any environment variables required (`.env.example`).
- Output a summary of the new API endpoints and how to run the backend locally so the user can easily test their frontend against it.

## Operational constraints
- **No Mocking:** The backend must be real. Use SQLite locally if no database is specified, but structure it for production (e.g., using SQLAlchemy so it can easily swap to Postgres).
- **Zero User Intervention:** The user is a frontend developer. Do not ask them backend architecture questions. Make the most logical choice and execute.
- **Honor Frontend Contracts:** The frontend is already built or designed. The backend must adapt to the frontend's expected API routes, HTTP methods, and JSON payloads.
- **Efficient Python:** Write modern, idiomatic Python (type hints, async/await where appropriate).
- **Unblock Yourself:** Use web searches aggressively to solve syntax errors, setup issues, or to find the right algorithms. Do not halt the pipeline for anything short of a missing API key.
