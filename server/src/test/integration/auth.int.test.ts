import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, resetDb, registerOwner } from "./helpers";
import { prisma } from "../../config/prisma";

describe("auth flow", () => {
  beforeAll(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers an org + owner and returns tokens", async () => {
    const res = await api().post("/api/v1/auth/register").send({
      orgName: "Acme Inc",
      name: "Ada Lovelace",
      email: "ada@acme.test",
      password: "Password1",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe("OWNER");
    expect(res.body.data.tenant.id).toBeTruthy();
    // refresh token arrives as an httpOnly cookie
    const cookies = res.headers["set-cookie"] ?? [];
    expect(String(cookies)).toContain("refreshToken=");
  });

  it("rejects a duplicate email registration", async () => {
    const res = await api().post("/api/v1/auth/register").send({
      orgName: "Other Org",
      name: "Ada Again",
      email: "ada@acme.test",
      password: "Password1",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a weak password with a validation error", async () => {
    const res = await api().post("/api/v1/auth/register").send({
      orgName: "Weak Org",
      name: "Weak Pass",
      email: "weak@acme.test",
      password: "short",
    });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials and rejects wrong ones", async () => {
    const ok = await api()
      .post("/api/v1/auth/login")
      .send({ email: "ada@acme.test", password: "Password1" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toBeTruthy();

    const bad = await api()
      .post("/api/v1/auth/login")
      .send({ email: "ada@acme.test", password: "WrongPass1" });
    expect(bad.status).toBe(401);
  });

  it("GET /me returns the current user with a token, 401 without", async () => {
    const { token } = await registerOwner();

    const me = await api()
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBeTruthy();
    expect(me.body.data.tenant.id).toBeTruthy();

    const anon = await api().get("/api/v1/auth/me");
    expect(anon.status).toBe(401);

    const garbage = await api()
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not-a-real-token");
    expect(garbage.status).toBe(401);
  });

  it("rotates the refresh token via the cookie", async () => {
    const login = await api()
      .post("/api/v1/auth/login")
      .send({ email: "ada@acme.test", password: "Password1" });
    const cookie = login.headers["set-cookie"];

    const refreshed = await api()
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();

    const noCookie = await api().post("/api/v1/auth/refresh");
    expect(noCookie.status).toBe(401);
  });

  it("deactivated users are cut off on the very next request", async () => {
    const { token, user } = await registerOwner();

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const res = await api()
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
