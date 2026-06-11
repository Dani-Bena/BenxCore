import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

type AuthTokenPayload = {
  userId: number;
  companyId: number;
  role: string;
};

type SanitizedUserInput = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  companyId: number;
};

export class AuthServiceError extends AppError {}

function createToken(payload: AuthTokenPayload): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new AuthServiceError("JWT_SECRET is not defined", 500);
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: 7 * 24 * 60 * 60,
  });
}

function sanitizeUser(user: SanitizedUserInput) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    companyId: user.companyId,
  };
}

export async function registerUser(data: RegisterInput) {
  const { companyName, name, email, password } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AuthServiceError("User already exists", 409);
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
          active: true,
        },
      },
    },
    include: {
      users: true,
    },
  });

  const user = company.users[0];

  if (!user) {
    throw new AuthServiceError("User could not be created", 500);
  }

  const token = createToken({
    userId: user.id,
    companyId: company.id,
    role: user.role,
  });

  return {
    token,
    user: sanitizeUser({
      ...user,
      companyId: company.id,
    }),
  };
}

export async function loginUser(data: LoginInput) {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      company: true,
    },
  });

  if (!user || !user.active) {
    throw new AuthServiceError("Invalid credentials", 401);
  }

  if (!user.companyId) {
    throw new AuthServiceError("User has no company assigned", 401);
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    throw new AuthServiceError("Invalid credentials", 401);
  }

  const token = createToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
  });

  return {
    token,
    user: sanitizeUser(user),
  };
}

export async function getCurrentUser(userId: number) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      company: true,
    },
  });

  if (!user) {
    throw new AuthServiceError("User not found", 404);
  }

  if (!user.active) {
    throw new AuthServiceError("User is inactive", 403);
  }

  if (!user.companyId) {
    throw new AuthServiceError("User has no company assigned", 401);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    companyId: user.companyId,
    company: user.company,
  };
}