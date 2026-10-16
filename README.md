# Farm Backend · Aquaculture Farm Monitoring Platform

Real-time IoT backend for managing and monitoring aquaculture farms. It centralizes tenants, users, IoT blowers and sensor readings, threshold alerts, and the full operational data of the farm (tanks, batches and movements) behind a secured, multi-tenant REST + WebSocket API.

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI](https://github.com/Ilde-R/farm-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/Ilde-R/farm-backend/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license)

---

## Table of contents

- [Overview](#overview)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [API](#api)
- [WebSocket API](#websocket-api)
- [Data model](#data-model)
- [Security](#security)
- [Testing](#testing)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Docker & deployment](#docker--deployment)
- [Roadmap](#roadmap)
- [Links & contact](#links--contact)
- [License](#license)

---

## Overview

Aquaculture farms need to keep the water aerated: if a blower loses pressure, the oxygen level can drop and the stock is at risk. This backend continuously ingests pressure readings from ESP-based **blowers** over WebSocket, detects threshold breaches, tracks device connectivity in real time and exposes everything to the operator app through a secured API.

It is built as a **multi-tenant** platform: every farm (tenant) sees only its own users, devices, readings and tanks, and the backend broadcasts device events only to the authenticated users of the owning tenant.

## Key features

- **Multi-tenant authentication** — email/password with bcrypt, JWT access tokens and rotating refresh tokens persisted as revocable sessions.
- **IoT device provisioning** — generate and revoke device keys (`blwr_…`), configure thresholds, scale factor and save interval per blower.
- **Real-time ingestion over WebSocket** — devices push pressure readings; the backend acknowledges them and fans them out to the operator app.
- **Connectivity tracking** — heartbeat (ping/pong) plus automatic `device_online` / `device_offline` events, with periodic device-key revalidation.
- **Threshold alerts** — a reading is flagged as an alert when `psi <= currentThreshold`; alert-state transitions are persisted immediately.
- **High-throughput persistence** — scheduled readings are buffered in memory and flushed in batches (every 10 s or 100 rows) to keep the DB write path cheap.
- **Historical readings for charts** — aggregated queries by period (`today`, `month`, `year`, `all`) per blower.
- **Farm operations** — tanks, batches (stocking/harvest) and movements (transfers between tanks, outflows by sale or mortality), with soft-delete and history preservation.
- **API documentation** — OpenAPI/Swagger and a Scalar reference UI.
- **Container-ready** — multi-stage Docker build and a hardened production compose file.

## Tech stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 22 LTS, TypeScript 5.7 |
| Framework | NestJS 11 |
| ORM / DB | Prisma 7 + PostgreSQL |
| Real-time | `ws` WebSocket adapter (`@nestjs/platform-ws`) |
| Auth | `@nestjs/jwt`, `passport-jwt`, bcrypt |
| Validation | `class-validator`, `class-transformer`, Joi (env validation) |
| Security | Helmet, `@nestjs/throttler` (rate limiting) |
| API docs | `@nestjs/swagger` + `@scalar/nestjs-api-reference` |
| Testing | Jest (unit) + Supertest (e2e) |
| Tooling | ESLint, Prettier, Docker |

## Architecture

<p align="center">
  <img src="docs/architecture.svg" alt="Farm backend architecture: IoT devices, NestJS backend, PostgreSQL and operator app" width="900" />
</p>

> Diagram source (editable): [`docs/architecture.drawio`](docs/architecture.drawio) · Raster version (PNG): [`docs/architecture.png`](docs/architecture.png)

Devices authenticate with a device key and push readings. Operators authenticate with a JWT, consume live events and drive the farm through the REST API.

## Project structure

```text
src/
├── common/                 # Cross-cutting building blocks
│   ├── abstracts/          # Base service
│   ├── decorators/
│   ├── dto/                # Shared DTOs (pagination, ...)
│   ├── filters/            # HTTP + Prisma exception filters
│   ├── interceptors/       # Response transform + logging
│   ├── interface/
│   └── device-connection.registry.ts   # Online devices & broadcast
├── config/                 # Env loading and Joi validation
├── modules/
│   ├── auth/               # Register, login, refresh, logout, guards
│   ├── users/              # Profiles and account management
│   ├── aerations/          # IoT blowers, readings, alerts, WebSocket
│   │   ├── dto/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── websockets/     # Gateway + connection manager
│   ├── tanks/              # Tanks (soft-delete + history)
│   ├── batches/            # Batches / stocking / harvest
│   └── tank-movements/     # Transfers and stock outflows
├── prisma/                 # PrismaService (connection lifecycle)
├── app.module.ts
└── main.ts                 # Bootstrap, security, docs, WS adapter
prisma/
└── schema.prisma           # Data model
test/
└── app.e2e-spec.ts         # End-to-end tests
```

## API

All routes are served under the global prefix **`/api/v1`**. Interactive documentation is available once the server is running:

| Documentation | URL |
| --- | --- |
| Swagger UI | `http://localhost:3000/api-swagger` |
| Scalar UI | `http://localhost:3000/docs` |

Authenticated endpoints expect a bearer token: `Authorization: Bearer <access_token>`.

### Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Public | Register a user and create its tenant |
| `POST` | `/api/v1/auth/login` | Public | Log in, returns access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Public | Exchange a refresh token for a new access token |
| `POST` | `/api/v1/auth/logout` | JWT | Revoke the current session |
| `GET` | `/api/v1/users` | JWT | List users of the current tenant (paginated) |
| `GET` | `/api/v1/users/profile` | JWT | Get the current profile |
| `PATCH` | `/api/v1/users/profile` | JWT | Update the current profile |
| `PATCH` | `/api/v1/users/password` | JWT | Change the current password |
| `DELETE` | `/api/v1/users/profile` | JWT | Delete the current account |
| `POST` | `/api/v1/tanks` | JWT | Create a tank |
| `GET` | `/api/v1/tanks` | JWT | List tanks (paginated) |
| `GET` | `/api/v1/tanks/:id` | JWT | Get a tank |
| `PATCH` | `/api/v1/tanks/:id` | JWT | Update a tank |
| `DELETE` | `/api/v1/tanks/:id` | JWT | Soft-delete a tank |
| `POST` | `/api/v1/batches` | JWT | Create a batch (stocking) |
| `GET` | `/api/v1/batches` | JWT | List batches (paginated) |
| `GET` | `/api/v1/batches/:id` | JWT | Get a batch |
| `POST` | `/api/v1/batches/:id/harvest` | JWT | Harvest a batch |
| `PATCH` | `/api/v1/batches/:id` | JWT | Update a batch |
| `DELETE` | `/api/v1/batches/:id` | JWT | Delete a batch |
| `POST` | `/api/v1/tank-movements/transfers` | JWT | Transfer stock between tanks |
| `POST` | `/api/v1/tank-movements/outflows` | JWT | Record an outflow (sale / mortality) |
| `GET` | `/api/v1/tanks/:tankId/movements` | JWT | List movements of a tank |
| `GET` | `/api/v1/aerations/readings/chart` | JWT | Pressure readings for charts by period |
| `POST` | `/api/v1/aerations/provision` | JWT | Provision a blower and issue a device key |
| `GET` | `/api/v1/aerations/devices` | JWT | List device keys of the tenant |
| `PATCH` | `/api/v1/aerations/devices/:key/revoke` | JWT | Revoke a device key |
| `PATCH` | `/api/v1/aerations/blowers/:blowerId/config` | JWT | Update threshold / interval / scale factor |
| `DELETE` | `/api/v1/aerations/blowers/:blowerId` | JWT | Delete a blower and its keys |

## WebSocket API

The gateway runs on the same port and authenticates on connect through query parameters:

```text
ws://localhost:3000?token=<JWT>          # operator app (receives tenant events)
ws://localhost:3000?key=<DEVICE_KEY>     # blower/sensor (ingests readings)
```

### Client → server (device or app)

| Event | Direction | Payload | Description |
| --- | --- | --- | --- |
| `pressure_reading` | Device → server | `{ psi, deviceTs?, deviceTime? }` | Ingest a pressure reading |
| `set_new_threshold` | App → server | `{ blowerId?, threshold }` | Update the alert threshold |
| `register_blower` | Device → server | `{ blowerId }` | Register/attach the blower to its config |

### Server → client

| Event | Recipient | Description |
| --- | --- | --- |
| `reading_ack` | Device | Acknowledges a received reading |
| `device_config_update` | Device | Sends `scaleFactor` / `saveIntervalSeconds` on connect or change |
| `update_threshold` | Device & app | New threshold applied and broadcast to the tenant |
| `blower_registered` | Device | Confirms blower registration and current threshold |
| `device_online` | App | A blower of the tenant connected |
| `device_offline` | App | A blower of the tenant disconnected |
| `pressure_reading` | App | Broadcast of a persisted reading |
| `auth_error` | Device | Sent before closing a socket (e.g. key revoked) |

Connections are kept alive with a 35 s heartbeat, and device keys are revalidated every 5 minutes so revoked keys are dropped.

## Data model

| Model | Purpose |
| --- | --- |
| `Tenant` | A farm/organization; root of isolation |
| `User` | Operator account, belongs to a tenant |
| `Credential` | Hashed password (bcrypt), one per user |
| `Session` | Refresh token + expiry, revocable |
| `BlowerConfig` | IoT blower settings (threshold, scale factor, interval, metadata) |
| `DeviceKey` | Provisioned device key, revocable |
| `PressureReading` | Time-series reading (psi, `isAlert`, source, device time) |
| `Tank` | Physical tank (soft-deletable) |
| `Batch` | Stocking lot with quantity lifecycle (active → harvested) |
| `TankMovement` | Transfer, sale or mortality movement between tanks/batches |

Enums: `TanksStatus`, `BatchesStatus`, `MovementType`.

## Security

- **Password hashing** with bcrypt.
- **JWT access tokens** + **refresh tokens** stored as revocable sessions (7-day expiry) so logout and rotation are server-controlled.
- **Multi-tenant isolation**: repository/service queries are scoped by `tenantId` from the token, and real-time broadcasts only reach users of the owning tenant.
- **Dual WebSocket authentication**: JWT for the app, device key for hardware, with periodic revalidation of revoked keys.
- **Rate limiting** on auth endpoints (`3` requests / minute via `@nestjs/throttler`).
- **Hardened HTTP** with Helmet (CSP, etc.).
- **Strict input validation** with a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).
- **Validated configuration** at boot with Joi (the app refuses to start on invalid env).

## Testing

Unit tests (Jest) cover the aeration service, the WebSocket connection manager and the tank-movements repository.

```bash
npm run test        # unit tests
npm run test:cov    # unit tests with coverage
```

End-to-end smoke tests (Supertest) boot the full application and assert the API contract; they require a reachable PostgreSQL database:

```bash
npm run test:e2e
```

## Getting started

### Requirements

- Node.js 22 LTS or newer
- npm
- PostgreSQL (local or remote)
- Docker (optional)

### Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file at the project root (see [Environment variables](#environment-variables)):

   ```env
   PORT=3000
   DATABASE_URL="postgresql://user:password@localhost:5432/farm?schema=public"
   JWT_SECRET="a-long-random-secret"
   ```

3. Generate the Prisma client and sync the database:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Start the backend in watch mode:

   ```bash
   npm run start:dev
   ```

The API is then available at:

```text
http://localhost:3000/api/v1
```

Documentation:

```text
http://localhost:3000/api-swagger
http://localhost:3000/docs
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | Yes | HTTP/WebSocket port (default in examples: `3000`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `JWT_SECRET` | Yes | Secret used to sign access tokens |
| `DIRECT_DATABASE_URL` | No | Direct (non-pooled) connection string for migrations, if your provider requires it |

A template is provided in [`.env.template`](.env.template).

## Docker & deployment

Development:

```bash
docker compose up --build
```

The backend is exposed on `http://localhost:3000`.

Production uses a multi-stage image (`Dockerfile`) and a hardened compose file ([`docker-compose.prod.yml`](docker-compose.prod.yml)):

- Non-root `node` user
- Read-only root filesystem with a `tmpfs` for `/tmp`
- `no-new-privileges` security option
- Memory limits for small instances
- Migrations applied automatically on start (`prisma migrate deploy`)

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

## Roadmap

- [ ] Integration/e2e coverage for the WebSocket gateway
- [ ] Redis-backed pub/sub to scale the WebSocket layer horizontally
- [ ] Role-based permissions per tenant
- [ ] Push notifications for critical alerts

## Links & contact

| Resource | Link |
| --- | --- |
| Frontend / mobile app | [farm-frontend](https://github.com/Ilde-R/farm-frontend) |
| LinkedIn | [Ilde Noel Rios Ordaz](https://www.linkedin.com/in/ilde-noel-rios-ordaz-b757123b8/) |

**Author:** Ilde Rios — `ilderios0304@gmail.com`

### Screenshots

<!-- TODO: add your images to docs/screenshots/ and uncomment the block below. -->

<!--
![Swagger API reference](docs/screenshots/swagger.png)
![Real-time pressure dashboard](docs/screenshots/dashboard.png)
-->

## License

Proprietary — © 2026 Ilde Rios. All rights reserved. This repository is shared for portfolio and evaluation purposes; it is **not** open source. You may not copy, modify, distribute or use it without prior written permission.

---

> Never commit `.env` files, passwords, database URLs, JWT secrets or device keys to the repository.
