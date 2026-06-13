# TaskFlow

**TaskFlow is a multi-tenant SaaS for teams to plan projects, run a Kanban board, and collaborate in real time.** Sign up, get an isolated workspace for your organization, invite your team, and move work from *To Do* to *Done* together — with live updates, role-based permissions, and notifications built in.

---

## Why teams use TaskFlow

| If your team... | TaskFlow gives you... |
| --- | --- |
| Loses track of who's doing what | A shared **Kanban board** (To Do → In Progress → In Review → Done) with assignees on every task |
| Needs the work organized | **Projects** with members, status, colors, and start/end dates — plus sub-tasks and priorities |
| Works at the same time | **Real-time sync** — when a teammate moves or edits a task, everyone sees it instantly, no refresh |
| Wants to know who's online | **Live presence** showing which members are currently viewing a project |
| Misses important updates | **Notifications** for task assignments, comments, mentions, due dates, and new members |
| Cares about access control | **Role-based permissions** (Owner, Admin, Manager, Member, Viewer) at both org and project level |
| Runs multiple companies/clients | **Multi-tenancy** — each organization's data is fully isolated from every other tenant |

### What you get out of the box
- 🗂️ **Projects & tasks** — group work into projects, break tasks into sub-tasks, set priority (Low → Urgent) and due dates
- 📋 **Kanban workflow** — drag work through five statuses including a *Blocked* state
- 👥 **Team management** — invite members, assign roles, add/remove people per project
- 💬 **Comments** — discuss tasks inline with threaded, editable comments
- ⚡ **Live collaboration** — task and project changes broadcast over WebSockets in real time
- 🔔 **Notifications** — stay informed without checking constantly
- 🔐 **Secure auth** — JWT access/refresh tokens, hashed passwords, rate limiting, and security headers

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, Zustand, Tailwind CSS, Socket.IO client |
| Backend | Node.js, Express 5, Socket.IO, Zod validation |
| Database | PostgreSQL (Neon) via Prisma ORM |
| Auth | JWT (access + refresh), bcrypt, role-based middleware |
| Shared | `@taskflow/shared` workspace — single source of truth for enums, statuses, and socket events |

This is an **npm workspaces monorepo** with three packages: `client`, `server`, and `shared`.

---

## Getting started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (a free [Neon](https://neon.tech) project works well)

### 1. Install
```bash
git clone <repo-url>
cd taskflow-SaaS
npm install
```

### 2. Configure the server
```bash
cp server/.env.example server/.env
```
Fill in `server/.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://...   # pooled connection
DIRECT_URL=postgresql://...     # direct connection (for migrations)
JWT_SECRET=your-access-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
```

### 3. Set up the database
```bash
npm run db:generate   # generate the Prisma client
npm run db:migrate    # apply migrations
```

### 4. Run it
```bash
npm run dev           # starts server (:5000) and client (:3000) together
```
Open **http://localhost:3000**, register an organization, and you're in.

---

## Available scripts (root)

| Script | What it does |
| --- | --- |
| `npm run dev` | Run client + server together in watch mode |
| `npm run dev:server` | Run only the API (`:5000`) |
| `npm run dev:client` | Run only the web app (`:3000`) |
| `npm run build` | Production build of server and client |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |

---

For architecture, the data model, and the full API/socket reference, see **[DOCUMENTATION.md](DOCUMENTATION.md)**.
