import { Router } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { getAuthContext, parseId } from "../../utils/http.js";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from "./users.schemas.js";
import {
  createUser,
  deactivateUser,
  getUserById,
  listUsers,
  updateUser,
} from "./users.service.js";

export const usersRouter = Router();

usersRouter.use(authMiddleware);

usersRouter.get("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const result = listUsersQuerySchema.safeParse(req.query);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid query parameters",
      errors: result.error.flatten(),
    });
    return;
  }

  const users = await listUsers(context, result.data);

  res.json({
    users,
  });
});

usersRouter.get("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const userId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!userId) {
    res.status(400).json({
      message: "Invalid user id",
    });
    return;
  }

  const user = await getUserById(context, { userId });

  res.json({
    user,
  });
});

usersRouter.post("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const result = createUserSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  const user = await createUser(context, result.data);

  res.status(201).json({
    user,
  });
});

usersRouter.put("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const userId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!userId) {
    res.status(400).json({
      message: "Invalid user id",
    });
    return;
  }

  const result = updateUserSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  const user = await updateUser(context, { userId }, result.data);

  res.json({
    user,
  });
});

usersRouter.delete("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const userId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!userId) {
    res.status(400).json({
      message: "Invalid user id",
    });
    return;
  }

  const user = await deactivateUser(context, { userId });

  res.json({
    message: "User deactivated successfully",
    user,
  });
});
