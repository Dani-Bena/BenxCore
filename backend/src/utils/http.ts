import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export function parseId(id: string | undefined): number | null {
  if (!id) return null;

  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

export function getAuthContext(
  req: AuthenticatedRequest
): { companyId: number; userId: number } | null {
  const auth = req.auth;

  if (!auth?.companyId || !auth.userId) {
    return null;
  }

  return {
    companyId: auth.companyId,
    userId: auth.userId,
  };
}
