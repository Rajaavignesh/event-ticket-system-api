# Event & Ticket System API

A RESTful Event Management API built with Node.js and Express. It uses MySQL for high-integrity relational data such as users and bookings, and MongoDB for flexible event documents and system audit logs.

## Features

- User registration with bcrypt password hashing
- User login with JSON Web Tokens (JWT)
- Role-based access control for administrators
- Event creation and paginated event listing
- Atomic ticket reservation that prevents overselling
- MySQL booking records with MongoDB event enrichment
- Cross-database compensation and reconciliation workflow
- Request validation and unsafe-key rejection
- Helmet security headers, explicit CORS policy, and rate limiting
- Centralized JSON error handling
- Integration tests for authentication, event access, bookings, and concurrency

## Technology Stack

- Node.js 20+
- Express.js
- MySQL 8
- Sequelize
- MongoDB
- Mongoose
- JSON Web Token
- bcrypt
- express-validator
- Helmet
- CORS
- express-rate-limit
- Jest and Supertest

## Architecture

MySQL stores users and bookings because these records require constraints, relationships, and transactional integrity. MongoDB stores events and audit logs because event metadata can contain flexible and nested fields that may change over time.

The application uses controllers for HTTP concerns, services for business logic, models for database access, validation middleware for input rules, and shared middleware for authentication, authorization, security, and error handling. A repository layer is intentionally omitted because Sequelize and Mongoose already provide the required persistence abstractions for the current project size.

Because MySQL and MongoDB cannot participate in one normal local ACID transaction, booking uses a saga-style workflow. MongoDB performs an atomic conditional ticket reservation. MySQL then stores the booking. If MySQL fails, the application compensates by restoring the reserved MongoDB ticket. The reconciliation script detects and repairs incomplete booking states.

## Project Structure

```text
event-ticket-system-api/
├── postman/
│   └── Event & Ticket System API.postman_collection.json
├── scripts/
│   └── reconcile-bookings.js
├── sql/
│   └── mysql-schema.sql
├── src/
│   ├── config/
│   │   ├── env.js
│   │   ├── mongo.js
│   │   └── mysql.js
│   ├── controllers/
│   ├── models/
│   │   ├── mongodb/
│   │   └── mysql/
│   ├── routes/
│   ├── services/
│   ├── shared/
│   │   ├── errors/
│   │   ├── middlewares/
│   │   └── utils/
│   ├── validations/
│   ├── app.js
│   └── server.js
├── tests/
│   ├── integration/
│   └── app.test.js
├── .env.example
├── jest.config.js
├── package.json
└── README.md
```

## Prerequisites

Install the following locally:

- Node.js 20 or later
- MySQL Server 8
- MongoDB Community Server
- Git
- Visual Studio Code (optional)

Verify the installations:

```cmd
node --version
npm --version
git --version
```

If MySQL is not in the Windows PATH, use:

```cmd
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --version
```

## Installation

Clone the repository and install dependencies:

```cmd
git clone <your-github-repository-url>
cd event-ticket-system-api
npm install
```

Create `.env` from `.env.example`:

```env
NODE_ENV=development
PORT=3000

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=event_ticket_system
MYSQL_USER=root
MYSQL_PASSWORD=replace_with_your_mysql_password

MONGODB_URI=mongodb://127.0.0.1:27017/event_ticket_system

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1h

CORS_ORIGINS=http://localhost:3000
```

Never commit `.env` or `.env.test`.

## MySQL Setup

Open MySQL:

```cmd
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

Create the application database:

```sql
CREATE DATABASE event_ticket_system
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Import the schema from Windows Command Prompt:

```cmd
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p event_ticket_system < sql\mysql-schema.sql
```

MongoDB creates the configured database and collections when the application stores its first documents.

## Running the Application

Development mode:

```cmd
npm run dev
```

Production-style mode:

```cmd
npm start
```

Health check:

```http
GET http://localhost:3000/health
```

## Authentication

Protected endpoints require this header:

```http
Authorization: Bearer <jwt-token>
```

JWTs are stateless. Logging in again generates a new token, but an older unexpired token remains valid unless token revocation is implemented.

## API Endpoints

Base URL:

```text
http://localhost:3000/api/v1
```

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register a user |
| POST | `/auth/login` | Public | Authenticate and receive a JWT |
| GET | `/auth/me` | Authenticated | Return the current user |
| POST | `/events` | Admin | Create an event |
| GET | `/events?page=1&limit=10` | Public | List events with pagination |
| POST | `/bookings/:eventId` | Authenticated | Book one ticket for an event |
| GET | `/bookings/my-tickets` | Authenticated | List the current user's bookings with event details |

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json
```

```json
{
  "name": "Raja",
  "email": "raja@example.com",
  "password": "StrongPassword123!"
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "raja@example.com",
  "password": "StrongPassword123!"
}
```

### Create an administrator

Registration creates a normal user. Promote a trusted account directly in MySQL:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@example.com';
```

Log in again after changing the role so the new JWT contains the administrator role.

### Create Event

```http
POST /api/v1/events
Authorization: Bearer <admin-token>
Content-Type: application/json
```

```json
{
  "title": "Node.js Conference",
  "description": "A backend engineering conference",
  "date": "2027-01-20T09:00:00.000Z",
  "location": "Chennai Convention Centre",
  "totalTickets": 100,
  "metadata": {
    "tags": ["node.js", "express", "databases"],
    "guestSpeakers": [
      {
        "name": "Guest Speaker",
        "topic": "Reliable APIs"
      }
    ],
    "seatingChartUrl": "https://example.com/seating-chart.png"
  }
}
```

`availableTickets` is initialized from `totalTickets` by the application and should not be supplied by normal API clients.

### List Events

```http
GET /api/v1/events?page=1&limit=10
```

### Book Ticket

```http
POST /api/v1/bookings/<event-id>
Authorization: Bearer <user-token>
```

The MongoDB update includes `availableTickets > 0` in the update condition and decrements the value atomically. Therefore, when two users request the final ticket simultaneously, one succeeds and the other receives `409 EVENT_SOLD_OUT`.

### View My Tickets

```http
GET /api/v1/bookings/my-tickets
Authorization: Bearer <user-token>
```

Bookings are loaded from MySQL. Their event IDs are then resolved from MongoDB and joined in the service layer so the response includes event information such as the title.

## Error Format

Errors use a consistent JSON structure:

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication is required"
  }
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `400` | Validation or unsafe-input error |
| `401` | Missing or invalid authentication |
| `403` | Insufficient permissions |
| `404` | Resource or route not found |
| `409` | Duplicate resource or sold-out event |
| `429` | Rate limit exceeded |
| `500` | Unexpected internal error |

## Security Measures

- Passwords are hashed with bcrypt and never returned by API responses.
- JWT middleware protects booking and account endpoints.
- Administrator middleware protects event creation.
- express-validator validates request bodies, parameters, and pagination queries.
- Unsafe nested keys such as `$where`, `$ne`, `__proto__`, `constructor`, and `prototype` are rejected before processing.
- Helmet supplies protective HTTP response headers.
- CORS explicitly allows configured client origins.
- Request body size is limited.
- Authentication and general API rate limiting reduce brute-force and denial-of-service risk.
- Global error middleware prevents exception details from leaking to clients.
- Database credentials and JWT secrets are loaded from environment files.

## Testing

Create a separate `.env.test` using isolated databases:

```env
NODE_ENV=test
PORT=3001

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=event_ticket_test
MYSQL_USER=root
MYSQL_PASSWORD=replace_with_your_mysql_password

MONGODB_URI=mongodb://127.0.0.1:27017/event_ticket_test

JWT_SECRET=test_only_jwt_secret
JWT_EXPIRES_IN=1h
CORS_ORIGINS=http://localhost:3000
```

Run all tests:

```cmd
npm test
```

Run coverage:

```cmd
npm run test:coverage
```

Open the HTML coverage report on Windows:

```cmd
start coverage\lcov-report\index.html
```

The integration suite verifies authentication, password non-exposure, administrator access, event pagination, JWT protection, ticket booking, My Tickets enrichment, and concurrent attempts to reserve the final ticket.

## Reconciliation

Run the reconciliation process with:

```cmd
npm run reconcile:bookings
```

The script examines incomplete cross-database booking states and either completes or compensates them according to the stored reservation state. Run it from a trusted environment with the same database configuration as the API.

## Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start with nodemon |
| `npm start` | Start normally |
| `npm test` | Run all Jest tests serially |
| `npm run test:watch` | Rerun tests while editing |
| `npm run test:coverage` | Generate the coverage report |
| `npm run reconcile:bookings` | Reconcile incomplete booking states |

## Design Decision

The project separates HTTP handling, validation, business logic, persistence models, and shared middleware so each responsibility can be understood and tested independently. MySQL and Sequelize protect relational user and booking data, while MongoDB and Mongoose allow event metadata and logs to evolve without frequent relational schema changes. Ticket availability is changed through an atomic MongoDB conditional update to prevent overselling. Since a single ACID transaction cannot span the two independent databases, reservation identifiers, compensation logic, durable booking status, audit logs, and reconciliation are used to provide practical consistency and recovery.
