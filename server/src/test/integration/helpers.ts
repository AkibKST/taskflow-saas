import request from "supertest";
import app from "../../app";
import { prisma } from "../../config/prisma";

export const api = () => request(app);

/**
 * Wipe every app table (not _prisma_migrations) so each test file starts from
 * a clean slate. Table names are discovered from the database itself, so this
 * never drifts from the Prisma schema.
 */
export const resetDb = async () => {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename::text AS tablename FROM pg_tables
    WHERE schemaname = current_schema()
      AND tablename <> '_prisma_migrations'
  `;
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE`);
};

let userSeq = 0;

/** Register a fresh org + owner; returns the access token and ids. */
export const registerOwner = async (orgName?: string) => {
  userSeq += 1;
  const email = `owner${userSeq}-${Date.now()}@test.local`;
  const res = await api()
    .post("/api/v1/auth/register")
    .send({
      orgName: orgName ?? `Org ${userSeq}`,
      name: `Owner ${userSeq}`,
      email,
      password: "Password1",
    });
  if (res.status !== 201) {
    throw new Error(`registerOwner failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.data.accessToken as string,
    user: res.body.data.user as { id: string; email: string; role: string },
    tenant: res.body.data.tenant as { id: string; slug: string },
    email,
    password: "Password1",
  };
};

/**
 * Invite an email into the owner's tenant and accept the invite, returning the
 * new member's access token. Reads the raw invite token straight from the DB
 * (email delivery is a console stub under test).
 */
export const inviteAndAccept = async (
  ownerToken: string,
  tenantId: string,
  role: "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER"
) => {
  userSeq += 1;
  const email = `member${userSeq}-${Date.now()}@test.local`;

  const inviteRes = await api()
    .post("/api/v1/invite")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ email, role });
  if (inviteRes.status !== 201) {
    throw new Error(`invite failed (${inviteRes.status}): ${JSON.stringify(inviteRes.body)}`);
  }

  const invite = await prisma.inviteToken.findFirst({
    where: { tenantId, email, isAccepted: false },
  });
  if (!invite) throw new Error(`invite row not found for ${email}`);

  const acceptRes = await api()
    .post(`/api/v1/invite/${invite.token}/accept`)
    .send({ name: `Member ${userSeq}`, password: "Password1" });
  if (acceptRes.status !== 201 && acceptRes.status !== 200) {
    throw new Error(`accept failed (${acceptRes.status}): ${JSON.stringify(acceptRes.body)}`);
  }

  const loginRes = await api()
    .post("/api/v1/auth/login")
    .send({ email, password: "Password1" });

  return {
    token: loginRes.body.data.accessToken as string,
    user: loginRes.body.data.user as { id: string; email: string; role: string },
    email,
  };
};

/** Create a project as the given user; returns the project id. */
export const createProject = async (token: string, name = "Test Project") => {
  const res = await api()
    .post("/api/v1/projects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name });
  if (res.status !== 201) {
    throw new Error(`createProject failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.data as { id: string; name: string };
};
