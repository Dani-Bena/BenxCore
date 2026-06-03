import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { createClientSchema, updateClientSchema } from "./clients.schemas.js";

export const clientsRouter = Router();

clientsRouter.use(authMiddleware);

function getCompanyId(req: AuthenticatedRequest): number | null {
  return req.auth?.companyId ?? null;
}

function getUserId(req: AuthenticatedRequest): number | null {
  return req.auth?.userId ?? null;
}

function parseId(id: string | undefined): number | null {
  if (!id) return null;

  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

/**
 * GET /api/clients
 * Lists active clients by default.
 * Use ?includeInactive=true to include deactivated clients.
 */
clientsRouter.get("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const companyId = getCompanyId(authReq);

  if (!companyId) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const includeInactive = req.query.includeInactive === "true";

  const clients = await prisma.client.findMany({
    where: {
      companyId,
      ...(includeInactive ? {} : { active: true }),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.json({
    clients,
  });
});

/**
 * GET /api/clients/:id
 * Gets a single client only if it belongs to the authenticated company.
 */
clientsRouter.get("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const companyId = getCompanyId(authReq);
  const clientId = parseId(req.params.id);

  if (!companyId) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!clientId) {
    res.status(400).json({
      message: "Invalid client id",
    });
    return;
  }

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      companyId,
    },
  });

  if (!client) {
    res.status(404).json({
      message: "Client not found",
    });
    return;
  }

  res.json({
    client,
  });
});

/**
 * POST /api/clients
 * Creates a client associated with the authenticated user's company.
 */
clientsRouter.post("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const companyId = getCompanyId(authReq);
  const userId = getUserId(authReq);

  if (!companyId) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const result = createClientSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  const data = result.data;

  if (data.nif) {
    const existingClientWithNif = await prisma.client.findFirst({
      where: {
        companyId,
        nif: data.nif,
        active: true,
      },
    });

    if (existingClientWithNif) {
      res.status(409).json({
        message: "A client with this NIF already exists",
      });
      return;
    }
  }

  const client = await prisma.$transaction(async (tx) => {
    const createdClient = await tx.client.create({
      data: {
        ...data,
        companyId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Client",
        entityId: createdClient.id,
        action: "CREATE",
        newValue: createdClient,
        companyId,
        userId,
      },
    });

    return createdClient;
  });

  res.status(201).json({
    client,
  });
});

/**
 * PUT /api/clients/:id
 * Updates a client only if it belongs to the authenticated company.
 */
clientsRouter.put("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const companyId = getCompanyId(authReq);
  const userId = getUserId(authReq);
  const clientId = parseId(req.params.id);

  if (!companyId) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!clientId) {
    res.status(400).json({
      message: "Invalid client id",
    });
    return;
  }

  const result = updateClientSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  const existingClient = await prisma.client.findFirst({
    where: {
      id: clientId,
      companyId,
    },
  });

  if (!existingClient) {
    res.status(404).json({
      message: "Client not found",
    });
    return;
  }

  const data = result.data;

  if (data.nif) {
    const duplicatedClient = await prisma.client.findFirst({
      where: {
        companyId,
        nif: data.nif,
        active: true,
        id: {
          not: clientId,
        },
      },
    });

    if (duplicatedClient) {
      res.status(409).json({
        message: "Another client with this NIF already exists",
      });
      return;
    }
  }

  const updatedClient = await prisma.$transaction(async (tx) => {
    const client = await tx.client.update({
      where: {
        id: clientId,
      },
      data,
    });

    await tx.auditLog.create({
      data: {
        entityType: "Client",
        entityId: client.id,
        action: "UPDATE",
        oldValue: existingClient,
        newValue: client,
        companyId,
        userId,
      },
    });

    return client;
  });

  res.json({
    client: updatedClient,
  });
});

/**
 * DELETE /api/clients/:id
 * Soft delete: deactivates the client instead of deleting it from the database.
 */
clientsRouter.delete("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const companyId = getCompanyId(authReq);
  const userId = getUserId(authReq);
  const clientId = parseId(req.params.id);

  if (!companyId) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!clientId) {
    res.status(400).json({
      message: "Invalid client id",
    });
    return;
  }

  const existingClient = await prisma.client.findFirst({
    where: {
      id: clientId,
      companyId,
    },
  });

  if (!existingClient) {
    res.status(404).json({
      message: "Client not found",
    });
    return;
  }

  if (!existingClient.active) {
    res.status(409).json({
      message: "Client is already inactive",
    });
    return;
  }

  const deactivatedClient = await prisma.$transaction(async (tx) => {
    const client = await tx.client.update({
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
        entityId: client.id,
        action: "DELETE",
        oldValue: existingClient,
        newValue: client,
        companyId,
        userId,
      },
    });

    return client;
  });

  res.json({
    message: "Client deactivated successfully",
    client: deactivatedClient,
  });
});