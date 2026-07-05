import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, resetDb, registerOwner, inviteAndAccept, createProject } from "./helpers";
import { prisma } from "../../config/prisma";

describe("dashboard summary", () => {
  beforeAll(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requires authentication", async () => {
    const res = await api().get("/api/v1/dashboard/summary");
    expect(res.status).toBe(401);
  });

  it("returns tenant-wide stats for an owner and scopes them per tenant", async () => {
    const owner = await registerOwner("Summary Org");
    const project = await createProject(owner.token, "Summary Project");

    await api()
      .post(`/api/v1/projects/${project.id}/tasks`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Summary task", status: "TODO" });

    // A different tenant's data must never leak into the numbers
    await registerOwner("Other Org");

    const res = await api()
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    const s = res.body.data;
    expect(s.totalUsers).toBe(1);
    expect(s.totalProjects).toBe(1);
    expect(s.totalTasks).toBe(1);
    expect(s.tasksByStatus.TODO).toBe(1);
    expect(s.team).toHaveLength(1);
    expect(Array.isArray(s.myTasks)).toBe(true);
    expect(s.recentProjects[0].id).toBe(project.id);
  });

  it("omits tenant-wide stats for a plain member but returns their sections", async () => {
    const owner = await registerOwner();
    const member = await inviteAndAccept(owner.token, owner.tenant.id, "MEMBER");

    const res = await api()
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${member.token}`);

    expect(res.status).toBe(200);
    const s = res.body.data;
    expect(s.totalUsers).toBeUndefined();
    expect(s.team).toBeUndefined();
    expect(Array.isArray(s.myTasks)).toBe(true);
    expect(Array.isArray(s.recentProjects)).toBe(true);
    expect(typeof s.unreadNotifications).toBe("number");
  });
});
