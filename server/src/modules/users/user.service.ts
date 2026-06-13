import { prisma } from "../../config/prisma";

// Active users in the caller's tenant — used to populate member pickers, etc.
export const listUsersService = async (tenantId: string) => {
  return prisma.user.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
};
