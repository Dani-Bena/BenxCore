import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export type AuthPayload = {
  userId: number;
  companyId: number | null;
  role: string;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthPayload;
};

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Missing or invalid authorization header",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({
      message: "JWT_SECRET is not defined",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (typeof decoded !== "object" || decoded === null) {
      res.status(401).json({
        message: "Invalid token",
      });
      return;
    }

    const payload = decoded as JwtPayload & AuthPayload;

    (req as AuthenticatedRequest).auth = {
      userId: payload.userId,
      companyId: payload.companyId,
      role: payload.role,
    };

    next();
  } catch {
    res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}