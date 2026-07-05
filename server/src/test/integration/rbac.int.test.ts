import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  api,
  resetDb,
  registerOwner,
  inviteAndAccept,
  createProject,
} from "./helpers";
import { prisma } from "../../config/prisma";

/**
 * Role enforcement at both levels:
 *  - org role gates (VIEWER can't create projects, non-admins can't invite)
 *  - project role gates (a project VIEWER is read-only even when their org
 *    role would allow writing — the §3.2 fix)
 */
describe("role-based access control", () => {
  let owner: Awaited<ReturnType<typeof registerOwner>>;
  let viewer: Awaited<ReturnType<typeof inviteAndAccept>>;
  let member: Awaited<ReturnType<typeof inviteAndAccept>>;
  let project: { id: string };

  beforeAll(async () => {
    await resetDb();
    owner = await registerOwner("RBAC Org");
    // FREE plan seats = 3: owner + these two fill the workspace exactly.
    viewer = await inviteAndAccept(owner.token, owner.tenant.id, "VIEWER");
    member = await inviteAndAccept(owner.token, owner.tenant.id, "MEMBER");
    project = await createProject(owner.token, "RBAC project");
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("org VIEWER cannot create projects", async () => {
    const res = await api()
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${viewer.token}`)
      .send({ name: "viewer project" });
    expect(res.status).toBe(403);
  });

  it("org MEMBER cannot invite teammates", async () => {
    const res = await api()
      .post("/api/v1/invite")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ email: "nope@test.local", role: "MEMBER" });
    expect(res.status).toBe(403);
  });

  it("non-members of a project cannot read it (403)", async () => {
    const res = await api()
      .get(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(res.status).toBe(403);
  });

  it("a project VIEWER can read but not write tasks", async () => {
    // owner adds the org MEMBER to the project as a project-level VIEWER
    const add = await api()
      .post(`/api/v1/projects/${project.id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: "VIEWER" });
    expect(add.status).toBeLessThan(300);

    const read = await api()
      .get(`/api/v1/projects/${project.id}/tasks`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(read.status).toBe(200);

    const write = await api()
      .post(`/api/v1/projects/${project.id}/tasks`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ title: "should be blocked" });
    expect(write.status).toBe(403);
  });

  it("a project MEMBER can create and update tasks", async () => {
    const second = await createProject(owner.token, "writable project");
    await api()
      .post(`/api/v1/projects/${second.id}/members`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: member.user.id, role: "MEMBER" });

    const create = await api()
      .post(`/api/v1/projects/${second.id}/tasks`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ title: "real work", priority: "HIGH" });
    expect(create.status).toBe(201);
    const taskId = create.body.data.id;

    const update = await api()
      .patch(`/api/v1/projects/${second.id}/tasks/${taskId}`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ status: "IN_PROGRESS" });
    expect(update.status).toBe(200);
    expect(update.body.data.status).toBe("IN_PROGRESS");
  });

  it("tenant OWNER can access any project in the tenant without membership", async () => {
    const res = await api()
      .get(`/api/v1/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
  });
});
