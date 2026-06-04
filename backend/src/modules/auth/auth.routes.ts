import { Router, type Response } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import {
  AuthServiceError,
  getCurrentUser,
  loginUser,
  registerUser,
} from "./auth.service.js";

export const authRouter = Router();

function handleAuthError(error: unknown, res: Response) {
  if (error instanceof AuthServiceError) {
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

authRouter.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const authResult = await registerUser(result.data);

    res.status(201).json(authResult);
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const authResult = await loginUser(result.data);

    res.json(authResult);
  } catch (error) {
    handleAuthError(error, res);
  }
});

authRouter.get("/me", authMiddleware, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.auth) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  try {
    const user = await getCurrentUser(authReq.auth.userId);

    res.json({
      user,
    });
  } catch (error) {
    handleAuthError(error, res);
  }
});