# 🎓 UniHub: High-Concurrency Workshop Registration System

UniHub is a high-performance Workshop Registration and Management System designed to handle massive spikes of **12,000+ concurrent students** (simulating university enrollment rushes) with **100% transactional correctness** (zero double-selling, zero negative seats) and resilient high-load processing.

---

## 🏢 1. Core Services & System Architecture

The UniHub ecosystem is orchestrated via [docker-compose.yml](file:///d:/HCMUS/Third%20Year/SystemDesign/UniHub/docker-compose.yml):

### Core Application Services
*   **`backend` (Node.js/Express):** Core API Gateway handling registration logic, JWT validation, Redis rate-limiting, and PostgreSQL transactional locks.
*   **`ai-worker` (Python):** Background event-driven worker consuming RabbitMQ messages to generate AI workshop summaries via the Gemini API.
*   **`payment-gateway` (Node.js):** Silenced, high-speed mock service simulating third-party payment workflows in under 1ms.

### Supporting & Testing Services
*   **`k6` (Grafana k6):** Load testing utility executing custom high-concurrency simulation scenarios (up to 200 req/s / 500 VUs).
*   **`pgadmin` (pgAdmin 4):** Database administration tool for visual query exploration at `http://localhost:5050` (admin@unihub.com / admin).
*   **`redis-commander` (Web GUI):** Interactive dashboard to inspect Redis cache keys, locks, and rate limiters at `http://localhost:8081`.

### Core Infrastructure
*   **`postgres` (PostgreSQL 15):** Relational database storing students, workshops, registrations, and transactions.
*   **`redis` (Redis 7):** RAM-based cache storing Redlock keys and global API rate-limiting buckets.
*   **`rabbitmq` (RabbitMQ 3):** Message broker managing decoupled event queues (push notifications and AI summaries) at `http://localhost:15672` (admin / admin).

---

## ⚙️ 2. Setup & Installation Guide

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
*   [Node.js](https://nodejs.org/) (v20+ - only needed to run frontend/mobile locally outside Docker).

### Step-by-Step Local Deployment

#### Step A: Configure Backend & Infrastructure Environment
1. In the project root directory, copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. *(Optional)* Add your Gemini API key in `GOOGLE_API_KEY` to enable the AI Summary feature. **All other security keys and database passwords work perfectly out of the box (Zero-Config) for local testing!**

#### Step B: Configure Mobile Environment
1. Navigate to the mobile app folder:
   ```bash
   cd mobile/unihub-mobile
   ```
2. Copy the mobile example environment file:
   ```bash
   cp .env.example .env
   ```
   *(This maps the security keys for secure offline QR-Code check-in verification).*

#### Step C: Spin Up the Infrastructure
From the project root directory, run:
```bash
docker compose up -d --build
```
This command will build the optimized images, launch all core containers, apply Prisma migrations, and automatically **seed 12,000 students and test data** into the database.

#### Step D: Run Client Applications (Frontend & Mobile)

1.  **Frontend Dashboard (React + Vite):**
    *   Navigate to the frontend directory:
        ```bash
        cd frontend
        ```
    *   Install dependencies and run the local development server:
        ```bash
        npm install
        npm run dev
        ```
    *   Open `http://localhost:5173` in your browser.

2.  **Mobile App (React Native + Expo):**
    *   Navigate to the mobile app folder:
        ```bash
        cd mobile/unihub-mobile
        ```
    *   Install dependencies and start the Expo server:
        ```bash
        npm install
        npx expo start -c
        ```
    *   Scan the QR code displayed on your terminal using the **Expo Go** app on your phone!

#### Step E (Optional): Run the Spike Load Test (k6)
To simulate the full 12,000-student traffic spike (ramping up to **200 requests/second** in parallel):
```bash
docker compose --profile test up --force-recreate k6
```

---

### 🔑 Seeded Demo Accounts (Role-Based Testing)
Once the containers and frontends are active, you can instantly log in using the following seeded credentials:

| Role | Seeded Email | Default Password | Features Available |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@unihub.com` | `password123` | Create Workshops, Upload PDFs, view AI Summaries, manage rooms. |
| **Student** | `test@unihub.com` | `password123` | Browse catalog, register for workshops, make mock payments, view QR tickets. |
| **Staff** | `staff1@unihub.com` | `password123` | Verify QR tickets, manage offline student check-ins. |

---

## ⚡ 3. Advanced Techniques & Performance Engineering

UniHub implements the following system design patterns to maintain ultra-fast processing speeds during extreme load:

### 1. Two-Tier Concurrency Control
*   **Redis Redlock (Student-Workshop Scope):** Prevents a single student from double-clicking/spamming registrations inside memory in `<1ms` without placing load on the database.
*   **PostgreSQL Pessimistic Locks (`FOR UPDATE`):** Locks the workshop row during seat deduction transactions. This guarantees atomic seat decrementing and **completely eliminates overselling/negative seats**.

### 2. High-Load Node.js Optimization
*   **Thread Pool Scaling (`UV_THREADPOOL_SIZE=64`):** Increases Node's native C++ thread count from 4 to 64, enabling parallel cryptography (JWT verification) and database I/O processing.
*   **Connection Pool Scaling (`connection_limit=100`):** Maximizes parallel query execution limits inside PostgreSQL.

### 3. Decoupled Asynchronous Pipeline
*   **RabbitMQ Event-Driven Workers:** Decouples heavy AI PDF processing and push notifications away from the client-facing HTTP thread, keeping response times ultra-fast.

### 4. Third-Party Resilience (Circuit Breaker)
*   **Resilient Gateway Clients:** Integrates explicit HTTP request abort signals (`AbortController`) to block payment timeouts and shields the core API gateway from crashing if third-party services lag.
