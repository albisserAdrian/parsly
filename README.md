# Parsly

Distributed document processing system using Docling workers.

> ⚠️ **Work in Progress**: This project is under active development. The Python
> BullMQ library is not yet production-ready. Use at your own risk.

## Architecture

```bash
┌─────────────┐     ┌───────────────┐     ┌─────────────────┐
│   Hono API  │───▶ │ Message Queue │───▶ │ Docling Workers │
│   (Bun)     │     │ (Redis/BullMQ │     │   (Scalable)    │
└─────────────┘     └───────────────┘     └─────────────────┘
                            │                      │
                            ▼                      ▼
                    ┌───────────────┐     ┌─────────────────┐
                    │  Job Status   │     │     Object      │
                    │   Storage     │     │     Storage     │
                    │   (Redis)     │     │     (MinIO)     │
                    └───────────────┘     └─────────────────┘
```

## Tech Stack

- **API**: Hono + Bun
- **Message Queue**: BullMQ + Redis
- **Workers**: Python + Docling
- **Storage**: MinIO (S3-compatible)
- **Infrastructure**: Docker Compose

## Getting Started

### Prerequisites

- **Bun** (<https://bun.sh>)
- **Python 3.11+**
- **Docker & Docker Compose**

### Quick Start (Recommended)

1. **Clone and setup everything:**

```bash
git clone https://github.com/albisserAdrian/parsly
cd parsly
bun run setup
```

This installs Bun dependencies and creates a Python virtual environment with
all packages.

2. **Start infrastructure services:**

```bash
bun run setup:docker
```

3. **Copy environment files:**

```bash
cp packages/api/.env.example packages/api/.env
cp packages/worker/.env.example packages/worker/.env
```

4. **Run development servers:**

```bash
bun run dev
```

This starts both the API and worker in parallel.
