import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";

export const authRouter = Router();

function createToken(payload: {
  userId: number;
  companyId: number | null;
  role: string;
}) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: 7 * 24 * 60 * 60, // 7 días
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

  const { companyName, name, email, password } = result.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    res.status(409).json({
      message: "User already exists",
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const company = await prisma.company.create({
    data: {
      name: companyName,
      users: {
        create: {
          name,
          email,
          passwordHash,
          role: "ADMIN",
        },
      },
    },
    include: {
      users: true,
    },
  });

  const user = company.users[0];

  if (!user) {
    res.status(500).json({
      message: "User could not be created",
    });
    return;
  }

  const token = createToken({
    userId: user.id,
    companyId: company.id,
    role: user.role,
  });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: company.id,
    },
  });
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

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      company: true,
    },
  });

  if (!user) {
    res.status(401).json({
      message: "Invalid credentials",
    });
    return;
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    res.status(401).json({
      message: "Invalid credentials",
    });
    return;
  }

  const token = createToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
  });
});
authRouter.get("/me", authMiddleware, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.auth) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: authReq.auth.userId,
    },
    include: {
      company: true,
    },
  });

  if (!user) {
    res.status(404).json({
      message: "User not found",
    });
    return;
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      company: user.company,
    },
  });
});