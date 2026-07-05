import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, resetDb, registerOwner, createProject } from "./helpers";
import { prisma } from "../../config/prisma";

/**
 * The core multi-tenancy guarantee: no request authenticated against tenant B
 * may read or write anything belonging to tenant A. Cross-tenant projects are
 * reported as 404 (not 403) so their existence doesn't leak.
 */
describe("tenant isolation", () => {
  let ownerA: Awaited<ReturnType<typeof registerOwner>>;
  let ownerB: Awaited<ReturnType<typeof registerOwner>>;
  let projectA: { id: string };

  beforeAll(async () => {
    await resetDb();
    ownerA = await registerOwner("Tenant A");
    ownerB = await registerOwner("Tenant B");
    projectA = await createProject(ownerA.token, "A's secret project");
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("tenant B cannot read tenant A's project (404, no existence leak)", async () => {
    const res = await api()
      .get(`/api/v1/projects/${projectA.id}`)
      .set("Authorization", `Bearer ${ownerB.token}`);
    expect(res.status).toBe(404);
  });

  it("tenant B cannot create tasks in tenant A's project", async () => {
    const res = await api()
      .post(`/api/v1/projects/${projectA.id}/tasks`)
      .set("Authorization", `Bearer ${ownerB.token}`)
      .send({ title: "malicious task" });
    expect(res.status).toBe(404);
  });

  it("tenant B cannot update or delete tenant A's project", async () => {
    const patch = await api()
      .patch(`/api/v1/projects/${projectA.id}`)
      .set("Authorization", `Bearer ${ownerB.token}`)
      .send({ name: "hijacked" });
    expect(patch.status).toBe(404);

    const del = await api()
      .delete(`/api/v1/projects/${projectA.id}`)
      .set("Authorization", `Bearer ${ownerB.token}`);
    expect(del.status).toBe(404);

    // still intact for tenant A
    const check = await api()
      .get(`/api/v1/projects/${projectA.id}`)
      .set("Authorization", `Bearer ${ownerA.token}`);
    expect(check.status).toBe(200);
    expect(check.body.data.name).toBe("A's secret project");
  });

  it("project lists are scoped to the caller's tenant", async () => {
    const listB = await api()
      .get("/api/v1/projects")
      .set("Authorization", `Bearer ${ownerB.token}`);
    expect(listB.status).toBe(200);
    const items = listB.body.data.items ?? listB.body.data;
    const ids = (Array.isArray(items) ? items : []).map((p: any) => p.id);
    expect(ids).not.toContain(projectA.id);
  });

  it("search results are scoped to the caller's tenant", async () => {
    const res = await api()
      .get("/api/v1/search")
      .query({ q: "secret" })
      .set("Authorization", `Bearer ${ownerB.token}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body.data)).not.toContain(projectA.id);
  });

  it("unauthenticated requests are rejected outright", async () => {
    const res = await api().get("/api/v1/projects");
    expect(res.status).toBe(401);
  });
});
