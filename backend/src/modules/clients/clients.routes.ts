import { Router } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { getAuthContext, parseId } from "../../utils/http.js";
import { createClientSchema, updateClientSchema } from "./clients.schemas.js";
import {
  createClient,
  deactivateClient,
  getClientById,
  listClients,
  updateClient,
} from "./clients.service.js";

export const clientsRouter = Router();

clientsRouter.use(authMiddleware);

clientsRouter.get("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const includeInactive = req.query.includeInactive === "true";
  const clients = await listClients(context, { includeInactive });

  res.json({
    clients,
  });
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

  const client = await getClientById(context, { clientId });

  res.json({
    client,
  });
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

  const client = await createClient(context, result.data);

  res.status(201).json({
    client,
  });
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

  const client = await updateClient(context, { clientId }, result.data);

  res.json({
    client,
  });
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

  const client = await deactivateClient(context, { clientId });

  res.json({
    message: "Client deactivated successfully",
    client,
  });
});
