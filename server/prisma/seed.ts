/**
 * Development seed — gives a new contributor a working workspace with demo data
 * instead of an empty database. Idempotent: re-running updates the same demo
 * tenant rather than duplicating it.
 *
 *   npm run db:seed   (from server/)
 *
 * Demo login:  owner@demo.taskflow  /  Password123
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma";
import {
  ROLES,
  PROJECT_ROLES,
  TASK_STATUS,
  PRIORITY,
} from "@taskflow/shared";

const PASSWORD = "Password123";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-workspace" },
    update: {},
    create: { name: "Demo Workspace", slug: "demo-workspace" },
  });

  const mkUser = (name: string, email: string, role: string) =>
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: {},
      create: {
        tenantId: tenant.id,
        name,
        email,
        passwordHash,
        role: role as never,
        emailVerifiedAt: new Date(),
      },
    });

  const owner = await mkUser("Ada Owner", "owner@demo.taskflow", ROLES.OWNER);
  const dev = await mkUser("Bo Member", "member@demo.taskflow", ROLES.MEMBER);
  const viewer = await mkUser("Cy Viewer", "viewer@demo.taskflow", ROLES.VIEWER);

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id, plan: "PRO" as never, seats: 25 },
  });

  const project = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      name: "Website Relaunch",
      description: "Marketing site redesign and migration.",
      color: "#00ff41",
      members: {
        create: [
          { userId: owner.id, role: PROJECT_ROLES.MANAGER as never },
          { userId: dev.id, role: PROJECT_ROLES.MEMBER as never },
          { userId: viewer.id, role: PROJECT_ROLES.VIEWER as never },
        ],
      },
    },
  });

  const tasks = [
    { title: "Audit current pages", status: TASK_STATUS.DONE, priority: PRIORITY.MEDIUM },
    { title: "Design new homepage", status: TASK_STATUS.IN_PROGRESS, priority: PRIORITY.HIGH },
    { title: "Set up CMS", status: TASK_STATUS.TODO, priority: PRIORITY.MEDIUM },
    { title: "Migrate blog posts", status: TASK_STATUS.TODO, priority: PRIORITY.LOW },
  ];

  for (const [i, t] of tasks.entries()) {
    await prisma.task.create({
      data: {
        projectId: project.id,
        tenantId: tenant.id,
        createdById: owner.id,
        title: t.title,
        status: t.status as never,
        priority: t.priority as never,
        order: i,
        assignees: { create: [{ userId: dev.id }] },
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `✅ Seeded "${tenant.name}" — login owner@demo.taskflow / ${PASSWORD}`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
