import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, resetDb, registerOwner } from "./helpers";
import { prisma } from "../../config/prisma";

/** Pull the csrfToken value out of a Set-Cookie header array. */
const extractCsrfToken = (setCookie: string | string[] | undefined): string | null => {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  for (const c of cookies) {
    const match = c.match(/^csrfToken=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
};

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

  it("rotates the refresh token via the cookie + CSRF header", async () => {
    const login = await api()
      .post("/api/v1/auth/login")
      .send({ email: "ada@acme.test", password: "Password1" });
    const cookie = login.headers["set-cookie"];
    const csrf = extractCsrfToken(cookie);
    expect(csrf).toBeTruthy();

    const refreshed = await api()
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", csrf!);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();
    // Refresh rotates the CSRF token alongside the refresh token
    expect(extractCsrfToken(refreshed.headers["set-cookie"])).toBeTruthy();

    const noCookie = await api().post("/api/v1/auth/refresh");
    expect(noCookie.status).toBe(403); // CSRF check runs before the cookie check
  });

  it("rejects refresh without or with a wrong CSRF header (double-submit)", async () => {
    const login = await api()
      .post("/api/v1/auth/login")
      .send({ email: "ada@acme.test", password: "Password1" });
    const cookie = login.headers["set-cookie"];

    // Cookie present (what a cross-site request would send) but no header
    const noHeader = await api()
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie);
    expect(noHeader.status).toBe(403);

    // Header present but wrong
    const badHeader = await api()
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", "0".repeat(64));
    expect(badHeader.status).toBe(403);
  });

  it("logout requires the CSRF header and clears both cookies", async () => {
    const login = await api()
      .post("/api/v1/auth/login")
      .send({ email: "ada@acme.test", password: "Password1" });
    const cookie = login.headers["set-cookie"];
    const csrf = extractCsrfToken(cookie);
    const token = login.body.data.accessToken;

    const noHeader = await api()
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", cookie);
    expect(noHeader.status).toBe(403);

    const ok = await api()
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", cookie)
      .set("X-CSRF-Token", csrf!);
    expect(ok.status).toBe(200);
    const cleared = String(ok.headers["set-cookie"]);
    expect(cleared).toContain("refreshToken=;");
    expect(cleared).toContain("csrfToken=;");
  });

  it("locks an account after repeated failed logins and unlocks after the window", async () => {
    const { email, password, user } = await registerOwner();

    // 10 wrong passwords → the 10th locks the account
    for (let i = 0; i < 10; i++) {
      const res = await api()
        .post("/api/v1/auth/login")
        .send({ email, password: "WrongPass1" });
      expect(res.status).toBe(401);
    }

    // Even the correct password is refused while locked
    const locked = await api().post("/api/v1/auth/login").send({ email, password });
    expect(locked.status).toBe(429);

    // Lockout is recorded in the audit trail
    const audit = await prisma.auditLog.findFirst({
      where: { action: "auth.login_locked", targetId: user.id },
    });
    expect(audit).toBeTruthy();

    // Simulate the window elapsing → login succeeds and counters reset
    await prisma.user.update({
      where: { id: user.id },
      data: { lockedUntil: new Date(Date.now() - 1000) },
    });
    const ok = await api().post("/api/v1/auth/login").send({ email, password });
    expect(ok.status).toBe(200);

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fresh?.failedLoginCount).toBe(0);
    expect(fresh?.lockedUntil).toBeNull();
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
