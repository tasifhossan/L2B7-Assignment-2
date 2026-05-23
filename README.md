# DevPulse API

> A collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

**Live URL:** `[https://devpulse-delta.vercel.app/](https://devpulse-delta.vercel.app/)`

---

## Features

- User registration and login with JWT authentication
- Role-based access control (contributor and maintainer)
- Create, view, update, and delete issues
- Filter issues by type and status, sort by newest or oldest
- Secure password hashing with bcrypt
- Environment-based configuration
- Clean modular architecture

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js (LTS 24.x) | Runtime environment |
| TypeScript | Type-safe development |
| Express.js | Web framework with modular routing |
| PostgreSQL (NeonDB) | Relational database |
| Raw SQL (`pool.query`) | No ORM, no query builders |
| bcrypt | Password hashing (salt rounds: 10) |
| jsonwebtoken | JWT generation and verification |

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/tasifhossan/L2B7-Assignment-2.git
cd devpulse
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env` file in the root directory

```env
PORT=5000
DATABASE_URL=your_neondb_connection_string
JWT_SECRET=your_secret_key
BCRYPT_SALT_ROUNDS=10
```

### 4. Run the SQL schema on your NeonDB console

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'contributor'
    CHECK (role IN ('contributor', 'maintainer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE issues (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(20) NOT NULL
    CHECK (type IN ('bug', 'feature_request')),
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved')),
  reporter_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Start the development server

```bash
npm run dev
```

Server runs at `http://localhost:5000`

---

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT token |

### Issues

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/issues` | Authenticated | Create a new issue |
| GET | `/api/issues` | Public | Get all issues |
| GET | `/api/issues/:id` | Public | Get a single issue |
| PATCH | `/api/issues/:id` | Authenticated | Update an issue |
| DELETE | `/api/issues/:id` | Maintainer only | Delete an issue |

### Query Parameters for `GET /api/issues`

| Param | Values | Default |
|---|---|---|
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | none |
| `status` | `open`, `in_progress`, `resolved` | none |

**Example:**
```
GET /api/issues?sort=newest&type=bug&status=open
```

### Authorization Header

Protected routes require the JWT token in the request header:
```
Authorization: <your_jwt_token>
```

---

## Database Schema

### `users` table

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | Auto-incrementing primary key |
| `name` | VARCHAR(255) | Full name of the user |
| `email` | VARCHAR(255) | Unique login email |
| `password` | VARCHAR(255) | Bcrypt hashed password |
| `role` | VARCHAR(20) | `contributor` (default) or `maintainer` |
| `created_at` | TIMESTAMPTZ | Auto-generated on insert |
| `updated_at` | TIMESTAMPTZ | Auto-refreshed on update |

### `issues` table

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | Auto-incrementing primary key |
| `title` | VARCHAR(150) | Short issue headline |
| `description` | TEXT | Detailed explanation (min 20 chars) |
| `type` | VARCHAR(20) | `bug` or `feature_request` |
| `status` | VARCHAR(20) | `open` (default), `in_progress`, `resolved` |
| `reporter_id` | INTEGER | References the user who created the issue |
| `created_at` | TIMESTAMPTZ | Auto-generated on insert |
| `updated_at` | TIMESTAMPTZ | Auto-refreshed on update |

---

## User Roles & Permissions

| Role | Permissions |
|---|---|
| `contributor` | Register, login, create issues, view all issues, update own open issues |
| `maintainer` | All contributor permissions + update any issue, delete any issue, change issue status |

---

## Response Format

### Success
```json
{
  "success": true,
  "message": "Operation description",
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": {}
}
```

---

## Project Structure

```
src/
├── config/
│   └── db.ts                  
├── middleware/
│   ├── auth.middleware.ts    
│   └── error.middleware.ts   
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts
│   └── issues/
│       ├── issues.routes.ts
│       ├── issues.controller.ts
│       └── issues.service.ts
├── utils/
│   └── response.ts            
├── app.ts
└── server.ts
```

---

## Deployment

- **Backend:** Vercel
- **Database:** NeonDB (PostgreSQL)
- **Environment variables** configured in Vercel project settings

---

## License

This project was built as an academic assignment for Apollo Level 2 Web Development — Batch 7.
