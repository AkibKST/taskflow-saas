# TaskFlow SaaS — Project Story: Roles, Power & Communication

> A narrative + reference guide to **who can do what**, and **how information flows**
> between people inside TaskFlow. This reflects the actual data model
> ([schema.prisma](server/prisma/schema.prisma)) and the route guards
> ([requireRole.ts](server/src/middleware/requireRole.ts)).

---

## 1. The World: A Multi-Tenant SaaS

TaskFlow is **multi-tenant**. Every company that signs up becomes a **Tenant**
(an isolated workspace). All users, projects, tasks, and notifications belong to
exactly one tenant — no data ever leaks across tenants.

```
Tenant (a company / workspace)
 ├── Users         (people, each with one tenant-wide Role)
 ├── Projects      (each has its own ProjectMembers + ProjectRole)
 │    └── Tasks    (with assignees, comments, sub-tasks)
 └── Notifications (per-user, in-tenant)
```

There are **two layers of roles**:

1. **Tenant Role** — your global rank in the whole workspace.
2. **Project Role** — your rank *inside a specific project* you've been added to.

A person can be a powerful `ADMIN` at the tenant level but only a `VIEWER`
on a project they were invited to observe. Both layers are checked.

---

## 2. The Cast: Tenant-Level Roles

Defined in `enum Role` — ordered from most to least power.

| Role | The Story | Power |
|------|-----------|-------|
| **OWNER** | The founder of the workspace. Created the tenant on sign-up. | Total control. Billing, tenant settings, every project & task, can manage all users. |
| **ADMIN** | The owner's right hand. Runs day-to-day operations. | Manage users, create/edit/delete any project, manage members, full task control. |
| **MANAGER** | Team lead / project owner. | Create & manage projects, add/remove project members, full task control. |
| **MEMBER** | The doer. The bulk of the team. | Work on tasks (create, edit, complete), comment, but **cannot** create or manage projects. |
| **VIEWER** | Stakeholder / client / auditor. | Read-only. Sees projects & tasks they're given access to. No writes at all. |

### What the code actually enforces

```
canManage  = OWNER, ADMIN, MANAGER        → create/edit/delete projects, add/remove members
canWrite   = OWNER, ADMIN, MANAGER, MEMBER → create/edit/delete tasks
(read)     = everyone authenticated        → list & view projects and tasks
VIEWER     = excluded from every write guard → effectively read-only
```

- **Projects** ([project.route.ts](server/src/modules/project/project.route.ts)):
  listing & viewing are open to all logged-in users; create/update/delete and
  member management require `canManage`.
- **Tasks** ([task.route.ts](server/src/modules/task/task.route.ts)):
  listing & viewing open to all; create/update/delete require `canWrite`
  (so MEMBERs can work, VIEWERs cannot).

---

## 3. The Sub-Cast: Project-Level Roles

Defined in `enum ProjectRole`. When someone is added to a project as a
`ProjectMember`, they get one of these — scoped **only to that project**.

| Project Role | Story | Power within the project |
|--------------|-------|--------------------------|
| **MANAGER** | Owns this project. | Configure the project, manage its members, full task control here. |
| **MEMBER** | Contributor on this project. | Create/work tasks, comment, get assigned. |
| **VIEWER** | Observer on this project. | Read tasks & comments only. |

> **Two-key rule:** an action is allowed only if **both** the tenant role *and*
> the project role permit it. Example: a tenant `MEMBER` who is a project
> `MANAGER` can manage that one project's members; a tenant `MEMBER` with no
> project membership can't even see it.

---

## 4. Flow of Communication Between Roles

People don't talk to the system in a vacuum — they talk **to each other through
the work**. Here are the main communication channels and who participates.

### A. Assignment Flow (Manager → Member)
```
MANAGER/ADMIN creates a Task
      │
      ├── assigns it to one or more MEMBERs (TaskAssignee)
      │
      ▼
Each assignee receives a Notification:  TASK_ASSIGNED
```
The MEMBER now owns execution. They move it through the board:
`TODO → IN_PROGRESS → IN_REVIEW → DONE` (or `BLOCKED`).

### B. Review Flow (Member → Manager)
```
MEMBER finishes work → sets status IN_REVIEW
      │
      ▼
MANAGER reviews → approves (DONE) or sends back (IN_PROGRESS / BLOCKED)
```

### C. Discussion Flow (everyone on the task)
```
Anyone with access comments on a Task (Comment, threaded via parentId)
      │
      ├── @mention a user  → Notification: MENTIONED
      └── new comment       → Notification: TASK_COMMENTED (to watchers/assignees)
```
VIEWERs can **read** the discussion but not post (read-only).

### D. Onboarding Flow (Manager/Admin → new person)
```
ADMIN/MANAGER adds a user to a Project (ProjectMember + ProjectRole)
      │
      ▼
Notification: MEMBER_JOINED  → the team is informed
```

### E. Deadline Flow (system → assignees)
```
A Task's dueDate approaches
      │
      ▼
System emits Notification: DUE_SOON  → to assignees
```

### Notification types (the system's voice)
From `enum NotificationType`:
`TASK_ASSIGNED`, `TASK_COMMENTED`, `DUE_SOON`, `MENTIONED`, `MEMBER_JOINED`.

---

## 5. Communication Map (who initiates → who hears)

```
OWNER ─────┐
ADMIN ─────┤ create projects, add people, set direction
MANAGER ───┘        │
                    ▼  assigns tasks, sets priorities/deadlines
                 MEMBER  ── does the work, comments, moves status
                    │
                    ▼  IN_REVIEW / questions / @mentions
                 MANAGER  ── reviews, unblocks, reassigns
                    │
                    ▼  status updates, comments
                 VIEWER  ── watches read-only (client/stakeholder), gets no write power
```

- **Downward** (Owner/Admin/Manager → Member): direction, assignment, deadlines.
- **Upward** (Member → Manager): progress, reviews, blockers, questions.
- **Sideways** (Member ↔ Member): comments & mentions on shared tasks.
- **Outward** (→ Viewer): visibility only; Viewers consume, never produce.
- **System → all**: notifications glue every channel together in real time.

---

## 6. Quick Permission Matrix

| Action | OWNER | ADMIN | MANAGER | MEMBER | VIEWER |
|--------|:-----:|:-----:|:-------:|:------:|:------:|
| View projects / tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create / edit / delete project | ✅ | ✅ | ✅ | ❌ | ❌ |
| Add / remove project members | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create / edit / delete task | ✅ | ✅ | ✅ | ✅ | ❌ |
| Comment on task | ✅ | ✅ | ✅ | ✅ | ❌ |
| Get assigned tasks | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage users / tenant settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Billing & ownership | ✅ | ❌ | ❌ | ❌ | ❌ |

> ✅/❌ above reflect the current `requireRole` guards plus intended tenant-admin
> scope. Project-level access additionally requires membership in that project.

---

*Source of truth: [schema.prisma](server/prisma/schema.prisma),
[requireRole.ts](server/src/middleware/requireRole.ts),
[project.route.ts](server/src/modules/project/project.route.ts),
[task.route.ts](server/src/modules/task/task.route.ts).*
