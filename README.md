> Case Study: Microservices-Based Backend System for Battery Passport
> A simplified, extensible microservices demo that shows authentication, role-based access control, battery passport CRUD, S3-compatible document storage, Kafka eventing, and a notification consumer.

---

## Table of contents

* [Overview](#overview)
* [Architecture](#architecture)
* [Features](#features)
* [Directory structure](#directory-structure)
* [Prerequisites](#prerequisites)
* [Quickstart (local with Docker Compose)](#quickstart-local-with-docker-compose)
* [Environment variables](#environment-variables)
  * [Common variables (docker-compose)](#common-variables-docker-compose)
  * [Auth service](#auth-service)
  * [Passport (Data) service](#passport-data-service)
  * [Document service](#document-service)
  * [Notification service](#notification-service)
* [API endpoints (summary)](#api-endpoints-summary)
* [Kafka topics & events](#kafka-topics--events)
* [Document storage (S3 / MinIO)](#document-storage-s3--minio)
* [Postman collection](#postman-collection)
* [Testing & logs](#testing--logs)
* [Development notes & tips](#development-notes--tips)
* [Bonus / Extras](#bonus--extras)
* [License](#license)
* [Contributors](#contributors)

---

# Overview

This project demonstrates a microservices backend for tracking "battery passports" — data artifacts that capture battery identity, composition, manufacturing, carbon footprint, and related documents. Core goals:

* Secure user registration / login with JWT and role-based access control (admin, user).
* Battery passport CRUD (admin-controlled creation/updates; users can view).
* Documents uploaded to S3-compatible storage with metadata in MongoDB.
* Event-driven design: Passport service emits Kafka events (`passport.created` etc.); Notification service consumes and sends (or logs) notifications.
* Containerized development environment (Docker Compose): MongoDB, Kafka, Zookeeper, MinIO (or AWS S3), and four services.

---

# Architecture

Each service is isolated and runs on its own port/container:

* `auth-service` — authentication, user model, JWT issuance, role checks
* `passport-service` — battery passport CRUD, emits Kafka domain events
* `document-service` — file uploads/downloads to S3-compatible storage; stores metadata in MongoDB
* `notification-service` — Kafka consumer; sends emails or writes notifications to file
* `kafka` — Kafka broker (and Zookeeper) used for asynchronous communication
* `mongodb` — central MongoDB (one container for demo; in prod each service may use its own DB)
* `s3` — MinIO (S3-compatible) or AWS S3 for file storage

Synchronous calls (HTTP) are used for auth token validation when needed; asynchronous events use Kafka.

---

# Features

* JWT-based auth with bcrypt password hashing
* Role-based middleware (`admin` / `user`)
* Passport CRUD with validation
* File upload (multipart/form-data) + S3 storage + Mongo metadata
* Kafka event emission (`passport.created`, `passport.updated`, `passport.deleted`)
* Notification consumer logs or writes messages to `notifications/*.txt`
* Docker Compose for local dev and testing
* Postman collection included for quick API testing

---

# Directory structure

```
└── jasjeev013-battery-passport-microservice/
    ├── README.md
    ├── Battery Passport Microservice API.postman_collection.json
    ├── docker-compose.yml
    ├── render.yaml
    ├── auth-service/
    │   ├── Dockerfile
    │   ├── package.json
    │   └── src/...
    ├── document-service/
    │   ├── Dockerfile
    │   ├── package.json
    │   └── src/...
    ├── kafka/
    │   └── Dockerfile
    ├── notification-service/
    │   ├── Dockerfile
    │   ├── package.json
    │   └── src/...
    └── passport-service/
        ├── Dockerfile
        ├── package.json
        └── src/...
```

(You already provided the full structure — the README assumes files are located exactly as above.)

---

# Prerequisites

* Docker & Docker Compose (v2+) installed locally
* Node.js (if running services individually without Docker)
* Optional: AWS account if you prefer using S3 instead of MinIO

---

# Quickstart (local with Docker Compose)

> This assumes your repository root contains `docker-compose.yml` and service folders listed above.

1. Clone your repo (already done if you are inside it).

2. Create `.env` files for each service (or a single root `.env`) using the [Environment variables](#environment-variables) section as reference.

3. Build and start everything:

```bash
# from repo root
docker compose up --build
```

4. Wait for services to boot. You should see logs for MongoDB, Kafka, MinIO (if included), and the four services.

5. Use the included Postman collection `Battery Passport Microservice API.postman_collection.json` to hit endpoints, or use `curl`.

---

# Environment variables

Use `.env` or Docker Compose environment section — keep secrets out of version control.

## Common variables (example)

```
# Common
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=24h

# MongoDB
MONGODB_URI=mongodb://mongodb:27017/battery_passport

# Kafka
KAFKA_BROKERS=kafka:9092

# Services
AUTH_SERVICE_URL=http://auth-service:3001

# AWS S3 (for document service)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-battery-passport-bucket

# Email (for notification service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@batterypassport.com
FROM_NAME=Battery Passport System
ENABLE_EMAIL_NOTIFICATIONS=true
```

### Auth service (`auth-service/.env`)

```
PORT=4000
MONGODB_URI=mongodb://mongo:27017/auth
JWT_SECRET=change_this_jwt_secret
JWT_EXPIRES_IN=1d
NODE_ENV=production
```

### Passport service (`passport-service/.env`)

```
PORT=5000
MONGODB_URI=mongodb://mongo:27017/passports
AUTH_SERVICE_URL=http://auth-service:4000  # used if the service validates tokens via auth-service
JWT_SECRET=change_this_jwt_secret
NODE_ENV=production
```

### Document service (`document-service/.env`)

```
PORT=5100
MONGODB_URI=mongodb://mongo:27017/documents
AUTH_SERVICE_URL=http://auth-service:4000  # used if the service validates tokens via auth-service
JWT_SECRET=change_this_jwt_secret

AWS_ACCESS_KEY_ID=<access-key-iam-user>
AWS_SECRET_ACCESS_KEY=<access-key-secret-key>
AWS_REGION=ap-south-1
S3_BUCKET_NAME=battery-passport-system
NODE_ENV=production
```

### Notification service (`notification-service/.env`)

```
PORT=5200
MONGODB_URI=mongodb://mongo:27017/notifications

SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=<app-password>
FROM_EMAIL=email@gmail.com
FROM_NAME=Battery Passport System

NOTIFICATION_LOG_PATH=./notifications
ENABLE_EMAIL_NOTIFICATIONS=false

NODE_ENV=production
```

> **Important:** Use same `JWT_SECRET` across services in this demo so JWTs issued by Auth can be validated by other services (or have services call Auth over HTTP to validate token).

---

# API endpoints (summary)

> Replace `HOST` with `localhost` and port with the service port or container name when calling between services.

## Auth Service (default port: `4000`)

* `POST /api/auth/register`
  Body: `{ "email":"you@example.com", "password":"pass", "role":"admin" }`
  Registers user and returns token.

* `POST /api/auth/login`
  Body: `{ "email":"you@example.com", "password":"pass" }`
  Returns `{ token, user }`.

> Note: roles supported: `admin`, `user`.

## Passport Service (default port: `5000`)

* `POST /api/passports` — Create passport (admin only). Emits `passport.created`.
* `GET /api/passports/:id` — Get a passport (admin/user with access).
* `PUT /api/passports/:id` — Update passport (admin only). Emits `passport.updated`.
* `DELETE /api/passports/:id` — Delete passport (admin only). Emits `passport.deleted`.

Sample request body (trimmed):

```json
{
  "data": {
    "generalInformation": {
      "batteryIdentifier": "BP-2024-011",
      "batteryModel": {
        "id": "LM3-BAT-2024",
        "modelName": "GMC WZX1"
      },
      "batteryMass": 450,
      "batteryCategory": "EV",
      "manufacturingDate": "2024-01-15"
    },
    "materialComposition": {
      "batteryChemistry": "LiFePO4",
      "criticalRawMaterials": ["Lithium","Iron"]
    },
    "carbonFootprint": {
      "totalCarbonFootprint": 850,
      "measurementUnit": "kg CO2e"
    }
  }
}
```

## Document Service (default port: `5100`)

* `POST /api/documents/upload` — Upload file (multipart/form-data, `file` field). Requires JWT.

  * Response: `{ docId, fileName, createdAt }`
* `PUT /api/documents/:docId` — Update metadata
* `DELETE /api/documents/:docId` — Delete file (also deletes from S3)
* `GET /api/documents/:docId` — Get downloadable link or proxy to S3

## Notification Service (default port: `5200`)

* Listens to Kafka topics (`passport.created` etc.). For demo: writes messages to `notifications/*.txt` or console.
* Optional HTTP endpoints (if implemented): `GET /api/notifications` to list received notifications.

---

# Kafka topics & events

The passport service emits domain events. Example topics (strings):

* `passport.created` — payload: passport id, summary, createdBy
* `passport.updated` — payload: passport id, updatedFields, updatedBy
* `passport.deleted` — payload: passport id, deletedBy

Notification service subscribes to these topics and sends/records notification messages.

---

# Document storage (S3)

For local development the `docker-compose.yml` can start a MinIO container. Configure the `document-service` to use MinIO endpoint and credentials.

Example S3 client usage (pseudocode):

```js
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  },
  forcePathStyle: true
});
```

Make sure the `S3_BUCKET` exists (the Compose file or init script can create it).

---

# Postman collection

`Battery Passport Microservice API.postman_collection.json` — import to Postman to test flows (register user, login, get token, create passport, upload document, etc).

---

# Testing & logs

* Each service logs to stdout (Docker Compose will show logs).
* Notification files are written to `notification-service/notifications/` (example file included).
* Optional: run unit tests with `npm test` inside each service folder if you added Jest tests.

---

# Development notes & tips

* To create an admin quickly (seed) you can either:

  * Call `POST /api/auth/register` with `role: "admin"`; or
  * Add a seed script to `auth-service` to create a default admin at startup when no users exist.

* Token usage: Include `Authorization: Bearer <token>` header on protected endpoints.

* Inter-service auth:

  * Either share `JWT_SECRET` across services (simple for demo) so each service can verify tokens locally, or
  * Have services call `auth-service` to validate tokens (slower but centralizes user management).

* If you use MinIO locally, access its web UI (usually `http://localhost:9001`) to confirm bucket contents.

---

# Troubleshooting

* `ECONNREFUSED` to `mongo` or `kafka` — ensure Docker Compose services finished starting (check logs).
* `AccessDenied` uploading to MinIO — verify `S3_ACCESS_KEY` and `S3_SECRET_KEY` match the MinIO container.
* JWT validation failing — confirm `JWT_SECRET` is identical where tokens are validated.

---

# Bonus / Extras (upcoming improvements)

* Add Swagger / OpenAPI for each service for interactive API docs.
* Centralized logging with Winston + log shipping (ELK / Loki).
* Add role-based resource ownership (users can only read passports they own).
* Add test suite (Jest) and minimal CI (GitHub Actions) to run lint/tests.
* Harden security: rate-limiting, HTTPS, more granular RBAC.
* Production Kafka: use hosted provider or k8s operator for resilience.

---

# License

MIT — adapt as you like.

---

# Contributors

* Original author: `jasjeev` (project owner)
