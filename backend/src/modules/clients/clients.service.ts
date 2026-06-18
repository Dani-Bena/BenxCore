import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import type {
  CreateClientInput,
  UpdateClientInput,
} from "./clients.schemas.js";

type ServiceContext = {
  companyId: number;
  userId: number | null;
};

type ClientIdInput = {
  clientId: number;
};

export class ClientServiceError extends AppError {}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function listClients(
  context: ServiceContext,
  options: {
    includeInactive?: boolean;
  } = {}
) {
  const { companyId } = context;
  const { includeInactive = false } = options;

  return prisma.client.findMany({
    where: {
      companyId,
      ...(includeInactive ? {} : { active: true }),
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getClientById(
  context: ServiceContext,
  input: ClientIdInput
) {
  const { companyId } = context;
  const { clientId } = input;

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      companyId,
    },
  });

  if (!client) {
    throw new ClientServiceError("Client not found", 404);
  }

  return client;
}

export async function createClient(
  context: ServiceContext,
  data: CreateClientInput
) {
  const { companyId, userId } = context;

  if (data.taxId) {
    const existingClientWithTaxId = await prisma.client.findFirst({
      where: {
        companyId,
        taxId: data.taxId,
        active: true,
      },
    });

    if (existingClientWithTaxId) {
      throw new ClientServiceError(
        "A client with this tax ID already exists",
        409
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const lastClient = await tx.client.findFirst({
      where: { companyId },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    const createdClient = await tx.client.create({
      data: {
        ...data,
        companyId,
        number: (lastClient?.number ?? 0) + 1,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Client",
        entityId: createdClient.id,
        action: "CREATE",
        newValue: toAuditJson(createdClient),
        companyId,
        userId,
      },
    });

    return createdClient;
  });
}

export async function updateClient(
  context: ServiceContext,
  input: ClientIdInput,
  data: UpdateClientInput
) {
  const { companyId, userId } = context;
  const { clientId } = input;

  const existingClient = await prisma.client.findFirst({
    where: {
      id: clientId,
      companyId,
    },
  });

  if (!existingClient) {
    throw new ClientServiceError("Client not found", 404);
  }

  if (data.taxId) {
    const duplicatedClient = await prisma.client.findFirst({
      where: {
        companyId,
        taxId: data.taxId,
        active: true,
        id: {
          not: clientId,
        },
      },
    });

    if (duplicatedClient) {
      throw new ClientServiceError(
        "Another client with this tax ID already exists",
        409
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const updatedClient = await tx.client.update({
      where: {
        id: clientId,
      },
      data,
    });

    await tx.auditLog.create({
      data: {
        entityType: "Client",
        entityId: updatedClient.id,
        action: "UPDATE",
        oldValue: toAuditJson(existingClient),
        newValue: toAuditJson(updatedClient),
        companyId,
        userId,
      },
    });

    return updatedClient;
  });
}

export async function deactivateClient(
  context: ServiceContext,
  input: ClientIdInput
) {
  const { companyId, userId } = context;
  const { clientId } = input;

  const existingClient = await prisma.client.findFirst({
    where: {
      id: clientId,
      companyId,
    },
  });

  if (!existingClient) {
    throw new ClientServiceError("Client not found", 404);
  }

  if (!existingClient.active) {
    throw new ClientServiceError("Client is already inactive", 409);
  }

  return prisma.$transaction(async (tx) => {
    const deactivatedClient = await tx.client.update({
      where: {
        id: clientId,
      },
      data: {
        active: false,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Client",
        entityId: deactivatedClient.id,
        action: "DELETE",
        oldValue: toAuditJson(existingClient),
        newValue: toAuditJson(deactivatedClient),
        companyId,
        userId,
      },
    });

    return deactivatedClient;
  });
}