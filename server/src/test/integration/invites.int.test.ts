import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, resetDb, registerOwner } from "./helpers";
import { prisma } from "../../config/prisma";

describe("invite lifecycle", () => {
  let owner: Awaited<ReturnType<typeof registerOwner>>;

  beforeAll(async () => {
    await resetDb();
    owner = await registerOwner("Invite Org");
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const invite = (email: string, role = "MEMBER") =>
    api()
      .post("/api/v1/invite")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ email, role });

  it("creates, lists, validates and accepts an invite", async () => {
    const created = await invite("newhire@test.local");
    expect(created.status).toBe(201);

    const list = await api()
      .get("/api/v1/invite")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body.data)).toContain("newhire@test.local");

    const row = await prisma.inviteToken.findFirst({
      where: { email: "newhire@test.local", isAccepted: false },
    });
    expect(row).toBeTruthy();

    const validate = await api().get(`/api/v1/invite/${row!.token}`);
    expect(validate.status).toBe(200);

    const accept = await api()
      .post(`/api/v1/invite/${row!.token}/accept`)
      .send({ name: "New Hire", password: "Password1" });
    expect([200, 201]).toContain(accept.status);

    // the token is single-use
    const again = await api()
      .post(`/api/v1/invite/${row!.token}/accept`)
      .send({ name: "Replay", password: "Password1" });
    expect(again.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects inviting an email that already has an account", async () => {
    const res = await invite(owner.email);
    expect(res.status).toBe(409);
  });

  it("a revoked invite can no longer be accepted", async () => {
    const created = await invite("revoked@test.local");
    expect(created.status).toBe(201);
    const inviteId = created.body.data.id;

    const revoke = await api()
      .delete(`/api/v1/invite/${inviteId}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(revoke.status).toBeLessThan(300);

    const row = await prisma.inviteToken.findUnique({ where: { id: inviteId } });
    const accept = await api()
      .post(`/api/v1/invite/${row!.token}/accept`)
      .send({ name: "Too Late", password: "Password1" });
    expect(accept.status).toBeGreaterThanOrEqual(400);
  });

  it("enforces the FREE plan seat cap (3 seats, pending invites count)", async () => {
    // seat 1 = owner, seat 2 = accepted invite from the first test.
    // This pending invite takes seat 3...
    const third = await invite("seat3@test.local");
    expect(third.status).toBe(201);

    // ...so a fourth seat must be refused.
    const fourth = await invite("seat4@test.local");
    expect(fourth.status).toBeGreaterThanOrEqual(400);
    expect(fourth.body.success).toBe(false);
  });

  it("rejects a weak password on accept", async () => {
    const row = await prisma.inviteToken.findFirst({
      where: { email: "seat3@test.local", isAccepted: false },
    });
    const res = await api()
      .post(`/api/v1/invite/${row!.token}/accept`)
      .send({ name: "Weak", password: "short" });
    expect(res.status).toBe(400);
  });

  it("garbage invite tokens are rejected", async () => {
    const res = await api().get("/api/v1/invite/not-a-real-token-at-all");
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
