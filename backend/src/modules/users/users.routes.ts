import { Router, type Response } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from "./users.schemas.js";
import {
  UsersServiceError,
  createUser,
  deactivateUser,
  getUserById,
  listUsers,
  updateUser,
} from "./users.service.js";

export const usersRouter = Router();

usersRouter.use(authMiddleware);

function parseId(id: string | undefined): number | null {
  if (!id) return null;

  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

function getAuthContext(req: AuthenticatedRequest) {
  const auth = req.auth;

  if (!auth?.companyId || !auth.userId) {
    return null;
  }

  return {
    companyId: auth.companyId,
    userId: auth.userId,
  };
}

function handleUsersError(error: unknown, res: Response) {
  if (error instanceof UsersServiceError) {
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

  try {
    const users = await listUsers(context, result.data);

    res.json({
      users,
    });
  } catch (error) {
    handleUsersError(error, res);
  }
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

  try {
    const user = await getUserById(context, { userId });

    res.json({
      user,
    });
  } catch (error) {
    handleUsersError(error, res);
  }
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

  try {
    const user = await createUser(context, result.data);

    res.status(201).json({
      user,
    });
  } catch (error) {
    handleUsersError(error, res);
  }
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

  try {
    const user = await updateUser(context, { userId }, result.data);

    res.json({
      user,
    });
  } catch (error) {
    handleUsersError(error, res);
  }
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

  try {
    const user = await deactivateUser(context, { userId });

    res.json({
      message: "User deactivated successfully",
      user,
    });
  } catch (error) {
    handleUsersError(error, res);
  }
});