# TeamLogger Monorepo

In-house employee time and activity tracker (TeamLogger alternative).

## Monorepo Architecture

```
teamlogger/
├── apps/
│   ├── api/        # Node.js + Express + Mongoose (TypeScript)
│   ├── web/        # React + Vite (TypeScript)
│   ├── agent/      # Electron tracking app (TypeScript)
│   └── worker/     # BullMQ background job worker (TypeScript)
├── packages/
│   └── shared/     # Shared Zod schemas, types, and constants
├── docker-compose.yml
├── SPEC.md
└── package.json
```

## Quick Start Guide

### 1. Start Infrastructure Services

Spin up MongoDB, Redis, and MinIO (S3-compatible) with automatic `screenshots` bucket creation:

```bash
docker compose up -d
```

### 2. Install Dependencies

Install root workspace and subpackage dependencies:

```bash
npm install
```

### 3. Build Packages

Build the shared package and apps:

```bash
npm run build
```

### 4. Running Apps in Development Mode

Run individual apps using npm workspace scripts:

```bash
# Start API server (http://localhost:4000)
npm run dev:api

# Start Web dashboard (http://localhost:3000)
npm run dev:web

# Start Desktop Agent (Electron)
npm run dev:agent

# Start Background Worker
npm run dev:worker
```

### 5. Lint & Format

```bash
# Run ESLint across workspace
npm run lint

# Format code with Prettier
npm run format
```

## Specification & Core Rules

Refer to [SPEC.md](SPEC.md) for full project specifications and data model definitions.
