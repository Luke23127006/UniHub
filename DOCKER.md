# UniHub Docker Guide

This document provides essential Docker commands to help the team manage the UniHub infrastructure, backend container, and load testing environment.

## 🚀 Starting the Stack

To start the database, Redis, RabbitMQ, pgAdmin, Redis Commander, and the Node.js backend in the background:

```bash
docker-compose up -d
```

## 🛑 Stopping the Stack

To stop all running containers:

```bash
docker-compose stop
```

To stop **and remove** the containers (preserves volumes/data):

```bash
docker-compose down
```

## 🔄 Rebuilding After Code Changes

If you modify the `backend` code, you need to rebuild the backend image before starting it again:

```bash
docker-compose up -d --build backend
```

## 📝 Viewing Logs

To view logs for all containers:

```bash
docker-compose logs -f
```

To view logs for the backend specifically:

```bash
docker logs unihub_backend -f
```

*(Press `Ctrl+C` to exit log streaming)*

## ⚡ Running the K6 Load Test

The K6 load testing service is configured under the `test` profile, meaning it will **not** run by default. To trigger the load test script (`backend/src/tests/loadtest.js`) against the internal backend container:

```bash
docker-compose --profile test up k6
```

## 🔑 Environment Variables
All configuration is centralized in the root `.env` file. If you need to change ports, database passwords, or credentials, update `.env` and restart the stack (`docker-compose down` followed by `docker-compose up -d`).
