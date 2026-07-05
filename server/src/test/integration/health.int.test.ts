import { describe, it, expect, afterAll } from "vitest";
import { api } from "./helpers";
import { prisma } from "../../config/prisma";

describe("health & hardening", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("liveness endpoint responds", async () => {
    const res = await api().get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  it("readiness endpoint verifies real DB connectivity", async () => {
    const res = await api().get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.db).toBe("ok");
  });

  it("unknown routes return a JSON 404", async () => {
    const res = await api().get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("stripe webhook fails closed when billing is not configured", async () => {
    const res = await api()
      .post("/api/v1/billing/webhook")
      .set("stripe-signature", "t=1,v1=bogus")
      .send({ type: "customer.subscription.updated" });
    expect(res.status).toBe(503);
  });

  it("oversized JSON bodies are rejected (256kb limit)", async () => {
    const big = "x".repeat(300 * 1024);
    const res = await api()
      .post("/api/v1/auth/login")
      .send({ email: "a@b.c", password: big });
    expect(res.status).toBe(413);
  });
});
