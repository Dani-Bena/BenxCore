import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
} from "./users.schemas.js";

type ServiceContext = {
  companyId: number;
  userId: number;
};

type UserIdInput = {
  userId: number;
};

export class UsersServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

function sanitizeUser(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  companyId: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    companyId: user.companyId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

async function assertAdmin(context: ServiceContext) {
  const currentUser = await prisma.user.findFirst({
    where: {
      id: context.userId,
      companyId: context.companyId,
      active: true,
      role: "ADMIN",
    },
  });

  if (!currentUser) {
    throw new UsersServiceError("Only ADMIN users can manage users", 403);
  }
}

async function countActiveAdmins(companyId: number) {
  return prisma.user.count({
    where: {
      companyId,
      active: true,
      role: "ADMIN",
    },
  });
}

async function assertCanRemoveAdminRole(params: {
  companyId: number;
  targetUser: {
    id: number;
    role: string;
    active: boolean;
  };
}) {
  const { companyId, targetUser } = params;

  if (targetUser.role !== "ADMIN" || !targetUser.active) {
    return;
  }

  const activeAdmins = await countActiveAdmins(companyId);

  if (activeAdmins <= 1) {
    throw new UsersServiceError(
      "Cannot remove or deactivate the last active ADMIN user",
      409
    );
  }
}

export async function listUsers(
  context: ServiceContext,
  query: ListUsersQuery = {
    includeInactive: false,
  }
) {
  await assertAdmin(context);

  const { companyId } = context;
  const { includeInactive = false } = query;

  const users = await prisma.user.findMany({
    where: {
      companyId,
      ...(includeInactive ? {} : { active: true }),
    },
    orderBy: [
      {
        active: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return users.map(sanitizeUser);
}

export async function getUserById(
  context: ServiceContext,
  input: UserIdInput
) {
  await assertAdmin(context);

  const user = await prisma.user.findFirst({
    where: {
      id: input.userId,
      companyId: context.companyId,
    },
  });

  if (!user) {
    throw new UsersServiceError("User not found", 404);
  }

  return sanitizeUser(user);
}

export async function createUser(
  context: ServiceContext,
  data: CreateUserInput
) {
  await assertAdmin(context);

  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new UsersServiceError("User already exists", 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const createdUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      active: true,
      companyId: context.companyId,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "User",
      entityId: createdUser.id,
      action: "CREATE",
      newValue: toAuditJson(sanitizeUser(createdUser)),
      companyId: context.companyId,
      userId: context.userId,
    },
  });

  return sanitizeUser(createdUser);
}

export async function updateUser(
  context: ServiceContext,
  input: UserIdInput,
  data: UpdateUserInput
) {
  await assertAdmin(context);

  const existingUser = await prisma.user.findFirst({
    where: {
      id: input.userId,
      companyId: context.companyId,
    },
  });

  if (!existingUser) {
    throw new UsersServiceError("User not found", 404);
  }

  const willChangeRoleFromAdmin =
    existingUser.role === "ADMIN" &&
    data.role !== undefined &&
    data.role !== "ADMIN";

  const willDeactivateAdmin =
    existingUser.role === "ADMIN" &&
    existingUser.active &&
    data.active === false;

  if (willChangeRoleFromAdmin || willDeactivateAdmin) {
    await assertCanRemoveAdminRole({
      companyId: context.companyId,
      targetUser: existingUser,
    });
  }

  if (data.email && data.email !== existingUser.email) {
    const existingEmailUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingEmailUser) {
      throw new UsersServiceError("User email already exists", 409);
    }
  }

  const passwordHash = data.password
    ? await bcrypt.hash(data.password, 10)
    : undefined;

  const updatedUser = await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "User",
      entityId: updatedUser.id,
      action: "UPDATE",
      oldValue: toAuditJson(sanitizeUser(existingUser)),
      newValue: toAuditJson(sanitizeUser(updatedUser)),
      companyId: context.companyId,
      userId: context.userId,
    },
  });

  return sanitizeUser(updatedUser);
}

export async function deactivateUser(
  context: ServiceContext,
  input: UserIdInput
) {
  await assertAdmin(context);

  const existingUser = await prisma.user.findFirst({
    where: {
      id: input.userId,
      companyId: context.companyId,
    },
  });

  if (!existingUser) {
    throw new UsersServiceError("User not found", 404);
  }

  if (!existingUser.active) {
    return sanitizeUser(existingUser);
  }

  if (existingUser.role === "ADMIN") {
    await assertCanRemoveAdminRole({
      companyId: context.companyId,
      targetUser: existingUser,
    });
  }

  const deactivatedUser = await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      active: false,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "User",
      entityId: deactivatedUser.id,
      action: "DELETE",
      oldValue: toAuditJson(sanitizeUser(existingUser)),
      newValue: toAuditJson(sanitizeUser(deactivatedUser)),
      companyId: context.companyId,
      userId: context.userId,
    },
  });

  return sanitizeUser(deactivatedUser);
}