import { prisma } from "../../config/prisma";
import AppError from "../../utils/AppError";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { emitToProject } from "../../socket";
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddMemberInput,
} from "./project.model";

const assertProjectInTenant = async (projectId: string, tenantId: string) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, isDeleted: false },
  });
  if (!project) throw new AppError(404, "Project not found");
  return project;
};

export const listProjectsService = async (tenantId: string) => {
  return prisma.project.findMany({
    where: { tenantId, isDeleted: false },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { tasks: { where: { isDeleted: false } } } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getProjectService = async (projectId: string, tenantId: string) => {
  return assertProjectInTenant(projectId, tenantId);
};

export const createProjectService = async (
  tenantId: string,
  creatorId: string,
  data: CreateProjectInput
) => {
  return prisma.project.create({
    data: {
      ...data,
      status: data.status as any,
      tenantId,
      members: {
        create: { userId: creatorId, role: "MANAGER" },
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
};

export const updateProjectService = async (
  projectId: string,
  tenantId: string,
  data: UpdateProjectInput
) => {
  await assertProjectInTenant(projectId, tenantId);

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { ...data, status: data.status as any },
  });

  emitToProject(projectId, SOCKET_EVENTS.PROJECT_UPDATED, updated);
  return updated;
};

export const deleteProjectService = async (
  projectId: string,
  tenantId: string
) => {
  await assertProjectInTenant(projectId, tenantId);
  return prisma.project.update({
    where: { id: projectId },
    data: { isDeleted: true },
  });
};

export const addMemberService = async (
  projectId: string,
  tenantId: string,
  data: AddMemberInput
) => {
  await assertProjectInTenant(projectId, tenantId);
  // upsert doubles as "add" and "change role" for an existing member.
  return prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: data.userId } },
    create: { projectId, userId: data.userId, role: (data.role as any) ?? "MEMBER" },
    update: { role: (data.role as any) ?? "MEMBER" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

export const removeMemberService = async (
  projectId: string,
  tenantId: string,
  userId: string
) => {
  await assertProjectInTenant(projectId, tenantId);
  return prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });
};
