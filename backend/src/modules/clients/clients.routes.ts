import { Router } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { createClientSchema, updateClientSchema } from "./clients.schemas.js";
import {
  ClientServiceError,
  createClient,
  deactivateClient,
  getClientById,
  listClients,
  updateClient,
} from "./clients.service.js";

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

function getAuthContext(req: AuthenticatedRequest) {
  const companyId = getCompanyId(req);

  if (!companyId) {
    return null;
  }

  return {
    companyId,
    userId: getUserId(req),
  };
}

function handleServiceError(error: unknown, res: any) {
  if (error instanceof ClientServiceError) {
    res.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    message: "Internal server error",
  });
}

clientsRouter.get("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  try {
    const includeInactive = req.query.includeInactive === "true";
    const clients = await listClients(context, { includeInactive });

    res.json({
      clients,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

clientsRouter.get("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const clientId = parseId(req.params.id);

  if (!context) {
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

  try {
    const client = await getClientById(context, { clientId });

    res.json({
      client,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

clientsRouter.post("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
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

  try {
    const client = await createClient(context, result.data);

    res.status(201).json({
      client,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

clientsRouter.put("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const clientId = parseId(req.params.id);

  if (!context) {
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

  try {
    const client = await updateClient(context, { clientId }, result.data);

    res.json({
      client,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

clientsRouter.delete("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const clientId = parseId(req.params.id);

  if (!context) {
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

  try {
    const client = await deactivateClient(context, { clientId });

    res.json({
      message: "Client deactivated successfully",
      client,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});