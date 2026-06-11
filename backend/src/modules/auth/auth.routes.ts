import { Router } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { getCurrentUser, loginUser, registerUser } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  const authResult = await registerUser(result.data);

  res.status(201).json(authResult);
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

  const authResult = await loginUser(result.data);

  res.json(authResult);
});

authRouter.get("/me", authMiddleware, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.auth) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  const user = await getCurrentUser(authReq.auth.userId);

  res.json({
    user,
  });
});
